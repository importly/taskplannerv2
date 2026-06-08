import { describe, expect, test } from "bun:test";
import type { TodoTask, TodoTaskList } from "microsoft-graph";
import { createTaskOperations, type TaskOperations } from "../src/tasks/taskOperations";
import type {
  CachedTask,
  CachedTaskPatch,
  CachedTaskUpsert,
  GoalRefResult,
  GoalRow,
  TaskRepository,
  TaskRefResult,
} from "../src/tasks/taskRepository";
import type { MsGraphTaskClient } from "../src/services/msGraphClient";
import type { SyncStats, TaskMutationResult } from "../src/tasks/taskTypes";

const tauriTaskRepositorySource = await Bun.file(
  new URL("../src/db/tauriTaskRepository.ts", import.meta.url),
).text();

type PlannedTaskOperationExports = {
  operations: TaskOperations;
  mutation: TaskMutationResult;
  sync: SyncStats;
};

const _plannedTaskOperationExports = null as PlannedTaskOperationExports | null;

class InMemoryTaskRepository implements TaskRepository {
  readonly calls: string[] = [];
  private readonly tasks = new Map<string, CachedTask>();

  constructor(initialTasks: CachedTask[] = []) {
    for (const task of initialTasks) {
      this.tasks.set(task.ms_task_id, { ...task });
    }
  }

  async listCachedTasks(): Promise<CachedTask[]> {
    this.calls.push("repo:list");
    return Array.from(this.tasks.values()).map((task) => ({ ...task }));
  }

  async listGoals(): Promise<GoalRow[]> {
    this.calls.push("repo:goals");
    return [];
  }

  async upsertTasks(tasks: CachedTaskUpsert[]): Promise<void> {
    this.calls.push(`repo:upsert:${tasks.map((task) => task.ms_task_id).join(",")}`);
    for (const task of tasks) {
      this.tasks.set(task.ms_task_id, { ...task });
    }
  }

  async updateTask(taskId: string, fields: CachedTaskPatch): Promise<void> {
    this.calls.push(`repo:update:${taskId}`);
    const existing = this.tasks.get(taskId);
    if (!existing) return;
    this.tasks.set(taskId, { ...existing, ...fields });
  }

  async deleteTask(taskId: string): Promise<void> {
    this.calls.push(`repo:delete:${taskId}`);
    this.tasks.delete(taskId);
  }

  async deleteTasksNotIn(taskIds: string[]): Promise<number> {
    this.calls.push(`repo:delete-not-in:${taskIds.join(",")}`);
    const keep = new Set(taskIds);
    let deleted = 0;
    for (const taskId of Array.from(this.tasks.keys())) {
      if (!keep.has(taskId)) {
        this.tasks.delete(taskId);
        deleted++;
      }
    }
    return deleted;
  }

  async linkTaskToGoal(taskId: string, goalId: string): Promise<void> {
    this.calls.push(`repo:link:${taskId}:${goalId}`);
    await this.updateTask(taskId, { linked_goal_id: goalId });
  }

  async unlinkTaskFromGoal(taskId: string): Promise<void> {
    this.calls.push(`repo:unlink:${taskId}`);
    await this.updateTask(taskId, { linked_goal_id: null });
  }

  async findTaskRef(ref: string): Promise<TaskRefResult> {
    const matches = this.snapshot().filter((task) => task.ms_task_id.startsWith(ref) || task.title === ref);
    if (matches.length === 1) return { kind: "found", task: matches[0] };
    if (matches.length > 1) return { kind: "ambiguous", matches };
    return { kind: "missing", matches: [] };
  }

  async findGoalRef(_ref: string): Promise<GoalRefResult> {
    return { kind: "missing", matches: [] };
  }

  snapshot(): CachedTask[] {
    return Array.from(this.tasks.values()).map((task) => ({ ...task }));
  }
}

function cachedTask(overrides: Partial<CachedTask> = {}): CachedTask {
  return {
    ms_task_id: "task-1",
    title: "Original title",
    body: null,
    status: "notStarted",
    due_date: null,
    list_id: "list-1",
    linked_goal_id: null,
    ...overrides,
  };
}

function graphTask(overrides: Partial<TodoTask> = {}): TodoTask {
  return {
    id: "task-1",
    title: "Graph title",
    status: "notStarted",
    body: { content: "Graph body", contentType: "text" },
    dueDateTime: { dateTime: "2026-06-10T00:00:00.000Z", timeZone: "UTC" },
    ...overrides,
  };
}

function makeGraphClient(options: {
  lists?: TodoTaskList[];
  tasksByList?: Record<string, TodoTask[]>;
  failComplete?: boolean;
  failDelete?: boolean;
  createdTask?: TodoTask;
} = {}): MsGraphTaskClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async fetchTodoLists() {
      calls.push("graph:lists");
      return options.lists ?? [{ id: "list-1", displayName: "Tasks" }];
    },
    async fetchTasksForList(listId) {
      calls.push(`graph:tasks:${listId}`);
      return options.tasksByList?.[listId] ?? [];
    },
    async createTask(listId, input) {
      calls.push(`graph:create:${listId}:${input.title}`);
      return options.createdTask ?? graphTask({ id: "created-task", title: input.title });
    },
    async updateTask(listId, taskId, fields) {
      calls.push(
        `graph:update:${listId}:${taskId}:${fields.title ?? ""}:${fields.body?.content ?? ""}:${
          fields.dueDateTime?.dateTime ?? ""
        }`,
      );
    },
    async completeTask(listId, taskId) {
      calls.push(`graph:complete:${listId}:${taskId}`);
      if (options.failComplete) throw new Error("graph complete failed");
    },
    async deleteTask(listId, taskId) {
      calls.push(`graph:delete:${listId}:${taskId}`);
      if (options.failDelete) throw new Error("graph delete failed");
    },
  };
}

describe("createTaskOperations", () => {
  test("Tauri repository preserves local goal links during upsert", () => {
    expect(tauriTaskRepositorySource).not.toContain('linked_goal_id: eb.ref("excluded.linked_goal_id")');
    expect(tauriTaskRepositorySource).not.toContain("linked_goal_title:");
    expect(tauriTaskRepositorySource).not.toContain("excluded.linked_goal_title");
    expect(tauriTaskRepositorySource).toContain('"goals.title as linked_goal_title"');
  });

  test("Tauri repository deletes missing tasks by chunked primary-key deletes", () => {
    expect(tauriTaskRepositorySource).not.toContain('"not in"');
    expect(tauriTaskRepositorySource).toContain("DELETE_TASK_CHUNK_SIZE");
    expect(tauriTaskRepositorySource).toContain('selectFrom("cached_tasks")');
    expect(tauriTaskRepositorySource).toContain('where("ms_task_id", "in", chunk)');
  });

  test("Tauri repository trims task refs before matching ids", () => {
    expect(tauriTaskRepositorySource).toContain("const normalizedRef = ref.trim()");
    expect(tauriTaskRepositorySource).toContain('if (!normalizedRef) return { kind: "missing", matches: [] }');
    expect(tauriTaskRepositorySource).toContain("task.ms_task_id.startsWith(normalizedRef)");
    expect(tauriTaskRepositorySource).toContain("goal.id === normalizedRef");
  });

  test("syncTasks preserves linked goal ids when updating existing cached tasks", async () => {
    const repository = new InMemoryTaskRepository([
      cachedTask({ title: "Local title", linked_goal_id: "goal-1" }),
      cachedTask({ ms_task_id: "stale-task", title: "Stale", linked_goal_id: "goal-stale" }),
    ]);
    const graph = makeGraphClient({
      tasksByList: { "list-1": [graphTask({ title: "Updated from Graph" })] },
    });
    const operations = createTaskOperations({ repository, graphClient: graph });

    await operations.syncTasks();

    expect(repository.snapshot()).toEqual([
      cachedTask({
        title: "Updated from Graph",
        body: "Graph body",
        due_date: "2026-06-10T00:00:00.000Z",
        linked_goal_id: "goal-1",
      }),
    ]);
  });

  test("completeTask updates Graph before deleting from the local cache", async () => {
    const repository = new InMemoryTaskRepository([cachedTask()]);
    const graph = makeGraphClient();
    const operations = createTaskOperations({ repository, graphClient: graph });
    const timeline: string[] = [];

    graph.completeTask = async (listId, taskId) => {
      timeline.push(`graph:complete:start:${listId}:${taskId}`);
      await Promise.resolve();
      timeline.push(`graph:complete:resolved:${listId}:${taskId}`);
    };
    repository.deleteTask = async (taskId) => {
      timeline.push(`repo:delete:${taskId}`);
      await InMemoryTaskRepository.prototype.deleteTask.call(repository, taskId);
    };

    await operations.completeTask({ listId: "list-1", taskId: "task-1" });

    expect(timeline).toEqual([
      "graph:complete:start:list-1:task-1",
      "graph:complete:resolved:list-1:task-1",
      "repo:delete:task-1",
    ]);
    expect(repository.calls).toContain("repo:delete:task-1");
    expect(repository.snapshot()).toEqual([]);
  });

  test("completeTask leaves the local cache unchanged when Graph fails", async () => {
    const existingTask = cachedTask({ linked_goal_id: "goal-1" });
    const repository = new InMemoryTaskRepository([existingTask]);
    const graph = makeGraphClient({ failComplete: true });
    const operations = createTaskOperations({ repository, graphClient: graph });

    await expect(operations.completeTask({ listId: "list-1", taskId: "task-1" })).rejects.toThrow(
      "graph complete failed",
    );

    expect(repository.snapshot()).toEqual([existingTask]);
    expect(repository.calls).toEqual([]);
  });

  test("linkTaskToGoal and unlinkTaskFromGoal are local-only operations", async () => {
    const repository = new InMemoryTaskRepository([cachedTask()]);
    const graph = makeGraphClient();
    const operations = createTaskOperations({ repository, graphClient: graph });

    await operations.linkTaskToGoal({ taskId: "task-1", goalId: "goal-1" });
    await operations.unlinkTaskFromGoal({ taskId: "task-1" });

    expect(graph.calls).toEqual([]);
    expect(repository.snapshot()).toEqual([cachedTask({ linked_goal_id: null })]);
    expect(repository.calls).toEqual([
      "repo:link:task-1:goal-1",
      "repo:update:task-1",
      "repo:unlink:task-1",
      "repo:update:task-1",
    ]);
  });

  test("createTask writes the Graph-created task to cache with an optional goal link", async () => {
    const repository = new InMemoryTaskRepository();
    const graph = makeGraphClient({
      createdTask: graphTask({
        id: "created-task",
        title: "Draft plan",
        body: { content: "Outline milestones", contentType: "text" },
        dueDateTime: { dateTime: "2026-06-11T00:00:00.000Z", timeZone: "UTC" },
      }),
    });
    const operations = createTaskOperations({ repository, graphClient: graph });

    const created = await operations.createTask({
      listId: "list-1",
      title: "Draft plan",
      body: "Outline milestones",
      dueDate: "2026-06-11T00:00:00.000Z",
      linkedGoalId: "goal-1",
    });

    expect(created).toEqual(
      cachedTask({
        ms_task_id: "created-task",
        title: "Draft plan",
        body: "Outline milestones",
        due_date: "2026-06-11T00:00:00.000Z",
        linked_goal_id: "goal-1",
      }),
    );
    expect(graph.calls).toEqual(["graph:create:list-1:Draft plan"]);
    expect(repository.snapshot()).toEqual([created]);
  });

  test("updateTask sends title body and due payload to Graph before updating local cache", async () => {
    const repository = new InMemoryTaskRepository([cachedTask()]);
    const graph = makeGraphClient();
    const operations = createTaskOperations({ repository, graphClient: graph });

    await operations.updateTask({
      listId: "list-1",
      taskId: "task-1",
      fields: {
        title: "Updated title",
        body: { content: "Updated body", contentType: "text" },
        dueDateTime: { dateTime: "2026-06-12T00:00:00.000Z", timeZone: "UTC" },
      },
    });

    expect(graph.calls).toEqual([
      "graph:update:list-1:task-1:Updated title:Updated body:2026-06-12T00:00:00.000Z",
    ]);
    expect(repository.snapshot()).toEqual([
      cachedTask({
        title: "Updated title",
        body: "Updated body",
        due_date: "2026-06-12T00:00:00.000Z",
      }),
    ]);
  });
});
