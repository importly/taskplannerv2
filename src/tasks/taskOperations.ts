import type { TodoTask } from "microsoft-graph";
import type { MsGraphTaskClient, UpdateTaskInput } from "../services/msGraphClient";
import type { TaskRepository } from "./taskRepository";
import type {
  CachedTask,
  CachedTaskPatch,
  CachedTaskUpsert,
  CreateCachedTaskInput,
  SyncStats,
  TaskGoalRef,
  TaskRef,
  UpdateCachedTaskInput,
} from "./taskTypes";

export type TaskOperationsDependencies = {
  repository: TaskRepository;
  graphClient: MsGraphTaskClient;
};

function taskToCacheRecord(task: TodoTask, listId: string, linkedGoalId: string | null): CachedTaskUpsert | null {
  if (!task.id) return null;

  return {
    ms_task_id: task.id,
    title: task.title || "Untitled",
    body: task.body?.content || null,
    status: task.status || null,
    due_date: task.dueDateTime?.dateTime || null,
    list_id: listId,
    linked_goal_id: linkedGoalId,
  };
}

function updateInputToCachePatch(fields: UpdateTaskInput): CachedTaskPatch {
  const patch: CachedTaskPatch = {};

  if ("title" in fields) {
    patch.title = fields.title || "Untitled";
  }

  if ("body" in fields) {
    patch.body = fields.body?.content || null;
  }

  if ("status" in fields) {
    patch.status = fields.status || null;
  }

  if ("dueDateTime" in fields) {
    patch.due_date = fields.dueDateTime?.dateTime || null;
  }

  return patch;
}

export function createTaskOperations({ repository, graphClient }: TaskOperationsDependencies) {
  return {
    listCachedTasks(): Promise<CachedTask[]> {
      return repository.listCachedTasks();
    },

    async syncTasks(): Promise<SyncStats> {
      const existingTasks = await repository.listCachedTasks();
      const existingGoalLinks = new Map(existingTasks.map((task) => [task.ms_task_id, task.linked_goal_id]));
      const lists = await graphClient.fetchTodoLists();
      const taskIds: string[] = [];
      const tasksToUpsert: CachedTaskUpsert[] = [];

      for (const list of lists) {
        if (!list.id) continue;

        const tasks = await graphClient.fetchTasksForList(list.id);
        for (const task of tasks) {
          const cachedTask = taskToCacheRecord(task, list.id, existingGoalLinks.get(task.id || "") ?? null);
          if (!cachedTask) continue;

          taskIds.push(cachedTask.ms_task_id);
          tasksToUpsert.push(cachedTask);
        }
      }

      if (tasksToUpsert.length > 0) {
        await repository.upsertTasks(tasksToUpsert);
      }

      const tasksDeleted = await repository.deleteTasksNotIn(taskIds);

      return {
        listsFetched: lists.length,
        tasksFetched: taskIds.length,
        tasksUpserted: tasksToUpsert.length,
        tasksDeleted,
      };
    },

    async createTask(input: CreateCachedTaskInput): Promise<CachedTask> {
      const graphTask = await graphClient.createTask(input.listId, {
        title: input.title,
        dueDate: input.dueDate,
        body: input.body,
      });
      const cachedTask = taskToCacheRecord(graphTask, input.listId, input.linkedGoalId ?? null);
      if (!cachedTask) throw new Error("Graph createTask response did not include a task id");

      await repository.upsertTasks([cachedTask]);
      return cachedTask;
    },

    async updateTask({ listId, taskId, fields }: UpdateCachedTaskInput): Promise<void> {
      await graphClient.updateTask(listId, taskId, fields);

      const patch = updateInputToCachePatch(fields);
      if (Object.keys(patch).length > 0) {
        await repository.updateTask(taskId, patch);
      }
    },

    async completeTask({ listId, taskId }: TaskRef): Promise<void> {
      await graphClient.completeTask(listId, taskId);
      await repository.deleteTask(taskId);
    },

    async deleteTask({ listId, taskId }: TaskRef): Promise<void> {
      await graphClient.deleteTask(listId, taskId);
      await repository.deleteTask(taskId);
    },

    async linkTaskToGoal({ taskId, goalId }: TaskGoalRef): Promise<void> {
      await repository.linkTaskToGoal(taskId, goalId);
    },

    async unlinkTaskFromGoal({ taskId }: { taskId: string }): Promise<void> {
      await repository.unlinkTaskFromGoal(taskId);
    },
  };
}

export type TaskOperations = ReturnType<typeof createTaskOperations>;
