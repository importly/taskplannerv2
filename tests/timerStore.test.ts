import { beforeEach, describe, expect, test } from "bun:test";
import { useTimerStore } from "../src/stores/timerStore";

function resetTimerStore() {
  useTimerStore.setState({
    status: "IDLE",
    timerMode: "countdown",
    startTime: null,
    pausedAt: null,
    focusElapsedSeconds: 0,
    breakElapsedSeconds: 0,
    isMiniPlayer: false,
    targetMinutes: 25,
    stoppedAt: null,
  });
}

describe("timer mode", () => {
  beforeEach(() => {
    resetTimerStore();
  });

  test("defaults to countdown and only switches mode while idle", () => {
    let state = useTimerStore.getState();
    expect(state.timerMode).toBe("countdown");

    state.setTimerMode("stopwatch");
    expect(useTimerStore.getState().timerMode).toBe("stopwatch");

    useTimerStore.getState().start();
    useTimerStore.getState().setTimerMode("countdown");

    state = useTimerStore.getState();
    expect(state.status).toBe("ACTIVE");
    expect(state.timerMode).toBe("stopwatch");
  });
});

describe("removed timer penalty system", () => {
  beforeEach(() => {
    resetTimerStore();
  });

  test("does not expose penalty runtime state or enforcer actions", () => {
    const state = useTimerStore.getState() as unknown as Record<string, unknown>;

    for (const removedKey of [
      "penalized",
      "penaltyCountdown",
      "tick",
      "handleBlur",
      "handleFocus",
      "setPenalized",
      "setPenaltyCountdown",
    ]) {
      expect(Object.prototype.hasOwnProperty.call(state, removedKey), removedKey).toBe(false);
    }
  });

  test("does not keep penalty wiring in the app shell, timer UI, or session save path", async () => {
    const appSource = await Bun.file("src/App.tsx").text();
    const commandCenterSource = await Bun.file("src/pages/CommandCenter.tsx").text();
    const operationsSource = await Bun.file("src/db/operations.ts").text();

    for (const removedTerm of [
      "useEnforcer",
      "penalized",
      "penaltyCountdown",
      "handleBlur",
      "handleFocus",
      "setPenalized",
      "setPenaltyCountdown",
    ]) {
      expect(appSource, removedTerm).not.toContain(removedTerm);
      expect(commandCenterSource, removedTerm).not.toContain(removedTerm);
      expect(operationsSource, removedTerm).not.toContain(removedTerm);
    }
  });
});
