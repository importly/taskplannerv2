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
