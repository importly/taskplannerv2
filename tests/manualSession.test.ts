import { beforeEach, describe, expect, test } from "bun:test";
import { useSessionStore } from "../src/stores/sessionStore";

describe("manual session entry", () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  test("tracks manual session modal state and duration", () => {
    const initial = useSessionStore.getState() as any;
    expect(initial.isManualSessionOpen).toBe(false);
    expect(initial.manualDurationMinutes).toBe(25);

    initial.openManualSession();
    let state = useSessionStore.getState() as any;
    expect(state.isManualSessionOpen).toBe(true);

    state.setManualDurationMinutes(45);
    state = useSessionStore.getState() as any;
    expect(state.manualDurationMinutes).toBe(45);

    state.reset();
    state = useSessionStore.getState() as any;
    expect(state.isManualSessionOpen).toBe(false);
    expect(state.manualDurationMinutes).toBe(25);
  });

  test("wires manual duration into the reflection save path", async () => {
    const commandCenterSource = await Bun.file("src/pages/CommandCenter.tsx").text();
    const modalSource = await Bun.file("src/components/timer/ReflectionModal.tsx").text();
    const operationsSource = await Bun.file("src/db/operations.ts").text();

    expect(commandCenterSource).toContain("openManualSession");
    expect(commandCenterSource).toContain("Log Missed Session");

    expect(modalSource).toContain("manualDurationMinutes");
    expect(modalSource).toContain("Duration");
    expect(modalSource).toContain("focusDurationSeconds");
    expect(modalSource).toContain("isManualSessionOpen");

    expect(operationsSource).toContain("SaveFocusSessionOptions");
    expect(operationsSource).toContain("focusDurationSeconds");
    expect(operationsSource).toContain("breakDurationSeconds");
  });
});
