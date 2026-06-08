import { describe, expect, test } from "bun:test";
import { runTaskCli } from "../cli/taskCli";
import type { CachedTask } from "../src/tasks/taskRepository";

const root = new URL("../", import.meta.url);

const cachedTask: CachedTask = {
  ms_task_id: "task-1",
  title: "Review task CLI",
  body: null,
  status: "notStarted",
  due_date: null,
  list_id: "list-1",
  linked_goal_id: null,
  linked_goal_title: null,
};

function createDeps() {
  const calls = {
    createContext: 0,
    syncTasks: 0,
    listCachedTasks: 0,
    fetchTodoLists: 0,
    createTask: 0,
  };
  const graphLists = [{ id: "list-1", displayName: "Tasks" }];

  return {
    calls,
    setGraphLists(lists: Array<{ id?: string; displayName?: string }>) {
      graphLists.splice(0, graphLists.length, ...lists);
    },
    deps: {
      createContext() {
        calls.createContext += 1;
        return {
          repository: {
            async findTaskRef() {
              return { kind: "found", task: cachedTask } as const;
            },
            async findGoalRef() {
              return { kind: "not_found" } as const;
            },
          },
          graphClient: {
            async fetchTodoLists() {
              calls.fetchTodoLists += 1;
              return graphLists;
            },
          },
          operations: {
            async syncTasks() {
              calls.syncTasks += 1;
              return { listsFetched: 1, tasksFetched: 1, tasksUpserted: 1, tasksDeleted: 0 };
            },
            async listCachedTasks() {
              calls.listCachedTasks += 1;
              return [cachedTask];
            },
            async createTask() {
              calls.createTask += 1;
              return cachedTask;
            },
          },
        };
      },
    },
  };
}

describe("task CLI source wiring", () => {
  test("exposes the bun task script", async () => {
    const packageJson = await Bun.file(new URL("package.json", root)).json();

    expect(packageJson.scripts.task).toBe("bun cli/taskCli.ts");
  });

  test("wires shared task operations, repository, graph client, formatting, and list resolution", async () => {
    const source = await Bun.file(new URL("cli/taskCli.ts", root)).text();

    expect(source).toContain('import { createTaskOperations } from "../src/tasks/taskOperations"');
    expect(source).toContain('import { createSqliteTaskRepository } from "./sqliteTaskRepository"');
    expect(source).toContain("createMsGraphClient");
    expect(source).toContain('"../src/services/msGraphClient"');
    expect(source).toContain("formatTaskTable");
    expect(source).toContain("resolveListId");
    expect(source).toContain("createTaskOperations({");
    expect(source).toContain("repository,");
    expect(source).toContain("graphClient,");
  });

  test("routes complete and delete mutation output through formatter helpers", async () => {
    const source = await Bun.file(new URL("cli/taskCli.ts", root)).text();

    expect(source).not.toContain('"OK  Completed task');
    expect(source).not.toContain('"OK  Deleted task');
    expect(source).toContain('formatMutationSuccess("Completed task"');
    expect(source).toContain('formatMutationSuccess("Deleted task"');
  });
});

describe("runTaskCli", () => {
  test("help does not create context or touch database/auth/network dependencies", async () => {
    const fixtures = createDeps();

    const result = await runTaskCli(["help"], fixtures.deps);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage: bun run task -- <command>");
    expect(fixtures.calls.createContext).toBe(0);
    expect(fixtures.calls.syncTasks).toBe(0);
    expect(fixtures.calls.fetchTodoLists).toBe(0);
  });

  test("list --cached reads only cached tasks and stays Graph-free", async () => {
    const fixtures = createDeps();

    const result = await runTaskCli(["list", "--cached"], fixtures.deps);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Cached tasks");
    expect(result.stdout).toContain("Review task CLI");
    expect(fixtures.calls.createContext).toBe(1);
    expect(fixtures.calls.syncTasks).toBe(0);
    expect(fixtures.calls.fetchTodoLists).toBe(0);
    expect(fixtures.calls.listCachedTasks).toBe(1);
  });

  test("normal list syncs once and does not fetch lists again just for labels", async () => {
    const fixtures = createDeps();

    const result = await runTaskCli(["list"], fixtures.deps);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Synced tasks");
    expect(fixtures.calls.syncTasks).toBe(1);
    expect(fixtures.calls.fetchTodoLists).toBe(0);
    expect(fixtures.calls.listCachedTasks).toBe(1);
  });

  test("add without --list rejects duplicate default Tasks lists with ids", async () => {
    const fixtures = createDeps();
    fixtures.setGraphLists([
      { id: "tasks-a", displayName: "Tasks" },
      { id: "tasks-b", displayName: "Tasks" },
    ]);

    const result = await runTaskCli(["add", "New task"], fixtures.deps);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERROR");
    expect(result.stderr).toContain("Default task list is ambiguous");
    expect(result.stderr).toContain("tasks-a");
    expect(result.stderr).toContain("tasks-b");
    expect(result.stderr).toContain("--list");
    expect(fixtures.calls.createTask).toBe(0);
  });

  test("parse and runtime errors return a nonzero error result", async () => {
    const fixtures = createDeps();

    const result = await runTaskCli(["wat"], fixtures.deps);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown task command "wat".');
    expect(fixtures.calls.createContext).toBe(0);
  });
});
