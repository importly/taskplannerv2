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
    penalized: false,
    penaltyCountdown: null,
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

describe("timer enforcer penalty", () => {
  beforeEach(() => {
    resetTimerStore();
  });

  test("starts and clears a blur grace countdown during active focus", () => {
    useTimerStore.getState().handleBlur();
    expect(useTimerStore.getState().penaltyCountdown).toBeNull();

    useTimerStore.getState().start();
    useTimerStore.getState().handleBlur();
    expect(useTimerStore.getState().penaltyCountdown).toBe(15);

    useTimerStore.getState().handleFocus();
    expect(useTimerStore.getState().penaltyCountdown).toBeNull();
    expect(useTimerStore.getState().penalized).toBe(false);
  });

  test("marks the active session penalized when the blur countdown expires", () => {
    useTimerStore.getState().start();
    useTimerStore.getState().handleBlur();

    for (let i = 0; i < 14; i += 1) {
      useTimerStore.getState().tick();
    }

    expect(useTimerStore.getState().penaltyCountdown).toBe(1);
    expect(useTimerStore.getState().penalized).toBe(false);

    useTimerStore.getState().tick();

    expect(useTimerStore.getState().penaltyCountdown).toBeNull();
    expect(useTimerStore.getState().penalized).toBe(true);
  });
});
