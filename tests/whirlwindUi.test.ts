import { describe, expect, test } from "bun:test";

const taskHooksSource = await Bun.file(new URL("../src/db/taskHooks.ts", import.meta.url)).text();
const whirlwindSource = await Bun.file(new URL("../src/pages/Whirlwind.tsx", import.meta.url)).text();

describe("Whirlwind task hooks", () => {
  test("task hooks compose the shared task operations with Tauri repository and Graph client", () => {
    expect(taskHooksSource).toContain('import { createMsGraphClient } from "../services/msGraphClient"');
    expect(taskHooksSource).toContain('import { acquireMsToken } from "../services/msalAuth"');
    expect(taskHooksSource).toContain("createTaskOperations");
    expect(taskHooksSource).toContain('import { createTauriTaskRepository } from "./tauriTaskRepository"');
    expect(taskHooksSource).toContain("createTaskOperations({");
    expect(taskHooksSource).toContain("repository: createTauriTaskRepository()");
    expect(taskHooksSource).toContain("graphClient: createMsGraphClient(acquireMsToken)");
  });

  test("task hooks no longer use optimistic mutation cache writes", () => {
    expect(taskHooksSource).not.toContain("onMutate: async");
    expect(taskHooksSource).not.toContain("setQueryData");
    expect(taskHooksSource).not.toContain("cancelQueries");
  });
});

describe("Whirlwind task editing UI", () => {
  test("wires update and delete mutations into inline task actions", () => {
    expect(whirlwindSource).toContain("useUpdateTask");
    expect(whirlwindSource).toContain("useDeleteTask");
    expect(whirlwindSource).toContain("editingTaskId");
    expect(whirlwindSource).toContain("taskError");
    expect(whirlwindSource).toContain("onEdit");
    expect(whirlwindSource).toContain("onDelete");
    expect(whirlwindSource).toContain("title=\"Edit task\"");
    expect(whirlwindSource).toContain("title=\"Delete task\"");
    expect(whirlwindSource).toContain("title=\"Save task\"");
    expect(whirlwindSource).toContain("title=\"Cancel edit\"");
  });

  test("scopes mutation success cleanup to the task that was saved", () => {
    expect(whirlwindSource).toContain("finishEditingTask(taskId)");
    expect(whirlwindSource).not.toContain("onSuccess: cancelEditingTask");
  });

  test("reveals hidden row actions on keyboard focus", () => {
    expect(whirlwindSource).toContain("focusedWithin");
    expect(whirlwindSource).toContain("onFocus={() => setFocusedWithin(true)}");
    expect(whirlwindSource).toContain("opacity: hovered || focusedWithin || isEditing ? 1 : 0");
  });

  test("wraps long task and linked-goal text inside rows", () => {
    expect(whirlwindSource).toContain('overflowWrap: "anywhere"');
    expect(whirlwindSource).toContain('wordBreak: "break-word"');
  });

  test("keeps task row props typed and avoids pointer cursor on non-clickable rows", () => {
    expect(whirlwindSource).toContain("type TaskRowProps =");
    expect(whirlwindSource).not.toContain("task: any");
    expect(whirlwindSource).not.toContain("goals: any[]");
    expect(whirlwindSource).not.toContain('transition: "background 150ms", cursor: "pointer"');
  });
});
