import { describe, expect, test } from "bun:test";
import { createMsGraphClient, MicrosoftAccountNotConnectedError, type GraphApiClient } from "../src/services/msGraphClient";

function makeApiRecorder(options: { deleteError?: unknown } = {}) {
  const calls: Array<{ path: string; method: string; payload?: unknown; filter?: string }> = [];
  const client: GraphApiClient = {
    api(path: string) {
      const state = { path, filter: undefined as string | undefined };
      return {
        filter(value: string) {
          state.filter = value;
          return this;
        },
        async get() {
          calls.push({ path, method: "get", filter: state.filter });
          return { value: [] };
        },
        async post(payload: unknown) {
          calls.push({ path, method: "post", payload });
          return { id: "task-1", title: (payload as { title: string }).title };
        },
        async patch(payload: unknown) {
          calls.push({ path, method: "patch", payload });
        },
        async delete() {
          calls.push({ path, method: "delete" });
          if (options.deleteError) throw options.deleteError;
        },
      };
    },
  };
  return { calls, client };
}

describe("createMsGraphClient", () => {
  test("fetches todo lists", async () => {
    const { calls, client } = makeApiRecorder();
    const graph = createMsGraphClient(async () => "token", () => client);

    await graph.fetchTodoLists();

    expect(calls).toEqual([{ path: "/me/todo/lists", method: "get", filter: undefined }]);
  });

  test("fetches incomplete tasks for a list", async () => {
    const { calls, client } = makeApiRecorder();
    const graph = createMsGraphClient(async () => "token", () => client);

    await graph.fetchTasksForList("list-1");

    expect(calls).toEqual([
      { path: "/me/todo/lists/list-1/tasks", method: "get", filter: "status ne 'completed'" },
    ]);
  });

  test("creates, updates, completes, and deletes tasks through Graph paths", async () => {
    const { calls, client } = makeApiRecorder();
    const graph = createMsGraphClient(async () => "token", () => client);

    await graph.createTask("list-1", { title: "Read notes", dueDate: "2026-06-10", body: "Chapter 4" });
    await graph.updateTask("list-1", "task-1", { title: "Read notes v2" });
    await graph.completeTask("list-1", "task-1");
    await graph.deleteTask("list-1", "task-1");

    expect(calls.map((call) => call.method)).toEqual(["post", "patch", "patch", "delete"]);
    expect(calls[0]).toEqual({
      path: "/me/todo/lists/list-1/tasks",
      method: "post",
      payload: {
        title: "Read notes",
        dueDateTime: { dateTime: "2026-06-10", timeZone: "UTC" },
        body: { content: "Chapter 4", contentType: "text" },
      },
    });
    expect(calls[1]).toEqual({
      path: "/me/todo/lists/list-1/tasks/task-1",
      method: "patch",
      payload: { title: "Read notes v2" },
    });
    expect(calls[2]).toEqual({
      path: "/me/todo/lists/list-1/tasks/task-1",
      method: "patch",
      payload: { status: "completed" },
    });
    expect(calls[3]).toEqual({
      path: "/me/todo/lists/list-1/tasks/task-1",
      method: "delete",
    });
  });

  test("ignores 404 errors when deleting tasks", async () => {
    const { calls, client } = makeApiRecorder({ deleteError: { statusCode: 404 } });
    const graph = createMsGraphClient(async () => "token", () => client);

    await graph.deleteTask("list-1", "task-1");

    expect(calls).toEqual([{ path: "/me/todo/lists/list-1/tasks/task-1", method: "delete" }]);
  });

  test("rethrows non-404 errors when deleting tasks", async () => {
    const deleteError = { statusCode: 500 };
    const { client } = makeApiRecorder({ deleteError });
    const graph = createMsGraphClient(async () => "token", () => client);

    await expect(graph.deleteTask("list-1", "task-1")).rejects.toBe(deleteError);
  });

  test("throws a login-required error when no token is available", async () => {
    const { client } = makeApiRecorder();
    const graph = createMsGraphClient(async () => null, () => client);

    await expect(graph.fetchTodoLists()).rejects.toThrow("Microsoft account is not connected");
    await expect(graph.fetchTodoLists()).rejects.toBeInstanceOf(MicrosoftAccountNotConnectedError);
  });
});
