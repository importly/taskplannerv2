import { describe, expect, test } from "bun:test";
import { formatError, formatMutationSuccess, formatTaskTable } from "../cli/taskCliFormat";
import type { CachedTask } from "../src/tasks/taskRepository";

const tasks: CachedTask[] = [
  {
    ms_task_id: "a81f2c000",
    title: "Finish CUDA notes",
    body: null,
    status: "notStarted",
    due_date: "2026-06-07T00:00:00.000Z",
    list_id: "inbox-list",
    linked_goal_id: "goal-1",
    linked_goal_title: "ML Systems",
  },
  {
    ms_task_id: "44be91000",
    title: "Email recruiter",
    body: null,
    status: "notStarted",
    due_date: null,
    list_id: "inbox-list",
    linked_goal_id: null,
    linked_goal_title: null,
  },
];

describe("task CLI formatting", () => {
  test("formats aligned task tables without emojis", () => {
    const output = formatTaskTable(tasks, {
      syncedLabel: "Tasks synced 2m ago",
      listNames: { "inbox-list": "Inbox" },
    });

    expect(output).toContain("Tasks synced 2m ago");
    expect(output).toContain("Inbox");
    expect(output).toContain("ID       Due         Goal                          Task");
    expect(output).toContain("a81f2c   2026-06-07  ML Systems                    Finish CUDA notes");
    expect(output).not.toMatch(/[^\x00-\x7F]/);
    expect(output).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  test("sanitizes non-ASCII input from all formatted fields", () => {
    const output = formatMutationSuccess("Created task ✅", {
      ms_task_id: "emoji-task",
      title: "Review résumé 🚀",
      body: null,
      status: "notStarted",
      due_date: null,
      list_id: "unicode-list",
      linked_goal_id: "goal-emoji",
      linked_goal_title: "Crème brûlée 📚",
    }, {
      listNames: { "unicode-list": "Café list 🧪" },
    });
    const error = formatError("Task failed ❌ because café");

    expect(output).toContain("OK  Created task");
    expect(output).toContain("Cafe list");
    expect(output).toContain("Creme brulee");
    expect(output).toContain("Review resume");
    expect(`${output}\n${error}`).not.toMatch(/[^\x00-\x7F]/);
  });

  test("collapses remote newlines so table rows stay single-line", () => {
    const output = formatTaskTable([
      {
        ...tasks[0],
        title: "Call Sam\nabout proposal",
        linked_goal_title: "Line one\r\nLine two",
      },
    ]);

    expect(output).toContain("Line one Line two");
    expect(output).toContain("Call Sam about proposal");
    expect(output).not.toContain("Call Sam\nabout proposal");
  });

  test("uses ellipsis markers for long goal titles without hiding the task title", () => {
    const output = formatTaskTable([
      {
        ...tasks[0],
        linked_goal_title: "Build a reliable Microsoft To Do synchronization workflow",
      },
    ]);

    expect(output).toContain("Build a reliable Microsoft...");
    expect(output).toContain("Finish CUDA notes");
    expect(output).not.toContain("Microsoft To Do synchronization workflow");
  });

  test("formats empty task tables", () => {
    expect(formatTaskTable([], { syncedLabel: "Cached tasks" })).toBe("Cached tasks\n\nNo tasks.");
  });

  test("shows goal title instead of raw goal id when available", () => {
    const output = formatTaskTable([tasks[0]]);

    expect(output).toContain("ML Systems");
    expect(output).not.toContain("goal-1");
  });

  test("formats success and errors with ASCII labels", () => {
    expect(formatMutationSuccess("Created task", tasks[0])).toStartWith("OK  Created task");
    expect(formatError("Task reference is ambiguous")).toBe("ERROR  Task reference is ambiguous");
  });
});
