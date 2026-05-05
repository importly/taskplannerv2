import { create } from "zustand";

export type TimerState = "idle" | "running" | "paused" | "penalty";

interface TimerStore {
  state: TimerState;
  elapsedSeconds: number;
}

export const useTimerStore = create<TimerStore>(() => ({
  state: "idle",
  elapsedSeconds: 0,
}));
