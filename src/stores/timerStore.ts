import { create } from "zustand";

export type TimerStatus = "IDLE" | "ACTIVE" | "PAUSED" | "STOPPED";

interface TimerStore {
  // State machine
  status: TimerStatus;

  // Timing
  startTime: number | null;          // Date.now() when ACTIVE began
  pausedAt: number | null;           // Date.now() when PAUSED began
  focusElapsedSeconds: number;       // accumulated focus seconds (not counting current active run)
  breakElapsedSeconds: number;       // accumulated break seconds

  // Enforcer
  penalized: boolean;
  penaltyCountdown: number | null;   // 15 -> 0, null when not active

  // Window
  isMiniPlayer: boolean;

  // Configuration
  targetMinutes: number;

  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  discard: () => void;
  commit: () => void;                // resets store (DB write handled before calling this in the UI/Service layer)
  tick: () => void;                  // Helper for penalty countdown
  handleBlur: () => void;
  handleFocus: () => void;
  setPenalized: () => void;
  setPenaltyCountdown: (n: number | null) => void;
  toggleMiniPlayer: () => void;
  setTargetMinutes: (m: number) => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  status: "IDLE",
  startTime: null,
  pausedAt: null,
  focusElapsedSeconds: 0,
  breakElapsedSeconds: 0,
  penalized: false,
  penaltyCountdown: null,
  isMiniPlayer: false,
  targetMinutes: 25,

  start: () => {
    if (get().status !== "IDLE") return;
    set({
      status: "ACTIVE",
      startTime: Date.now(),
      penalized: false,
      penaltyCountdown: null,
      focusElapsedSeconds: 0,
      breakElapsedSeconds: 0,
    });
  },

  pause: () => {
    const { status, startTime, focusElapsedSeconds } = get();
    if (status !== "ACTIVE" || !startTime) return;

    const now = Date.now();
    const sessionSeconds = (now - startTime) / 1000;

    set({
      status: "PAUSED",
      pausedAt: now,
      focusElapsedSeconds: focusElapsedSeconds + sessionSeconds,
      startTime: null,
    });
  },

  resume: () => {
    const { status, pausedAt, breakElapsedSeconds } = get();
    if (status !== "PAUSED" || !pausedAt) return;

    const now = Date.now();
    const breakSeconds = (now - pausedAt) / 1000;

    set({
      status: "ACTIVE",
      startTime: now,
      breakElapsedSeconds: breakElapsedSeconds + breakSeconds,
      pausedAt: null,
    });
  },

  stop: () => {
    const { status, startTime, pausedAt, focusElapsedSeconds, breakElapsedSeconds } = get();
    if (status !== "ACTIVE" && status !== "PAUSED") return;

    const now = Date.now();
    let finalFocusSeconds = focusElapsedSeconds;
    let finalBreakSeconds = breakElapsedSeconds;

    if (status === "ACTIVE" && startTime) {
      finalFocusSeconds += (now - startTime) / 1000;
    } else if (status === "PAUSED" && pausedAt) {
      finalBreakSeconds += (now - pausedAt) / 1000;
    }

    if (finalFocusSeconds < 60) {
      set({
        status: "IDLE",
        startTime: null,
        pausedAt: null,
        focusElapsedSeconds: 0,
        breakElapsedSeconds: 0,
        penalized: false,
        penaltyCountdown: null,
      });
      // Note: UI should handle showing the "Session too short" toast
      return;
    }

    set({
      status: "STOPPED",
      focusElapsedSeconds: finalFocusSeconds,
      breakElapsedSeconds: finalBreakSeconds,
      startTime: null,
      pausedAt: null,
      penaltyCountdown: null,
    });
  },

  discard: () => {
    set({
      status: "IDLE",
      startTime: null,
      pausedAt: null,
      focusElapsedSeconds: 0,
      breakElapsedSeconds: 0,
      penalized: false,
      penaltyCountdown: null,
    });
  },

  commit: () => {
    if (get().status !== "STOPPED") return;
    set({
      status: "IDLE",
      startTime: null,
      pausedAt: null,
      focusElapsedSeconds: 0,
      breakElapsedSeconds: 0,
      penalized: false,
      penaltyCountdown: null,
    });
  },

  tick: () => {
    const { status, penaltyCountdown, setPenalized } = get();
    if (status === "ACTIVE" && penaltyCountdown !== null) {
      if (penaltyCountdown > 0) {
        set({ penaltyCountdown: penaltyCountdown - 1 });
      } else {
        setPenalized();
      }
    }
  },

  handleBlur: () => {
    const { status, penalized } = get();
    if (status === "ACTIVE" && !penalized) {
      set({ penaltyCountdown: 15 });
    }
  },

  handleFocus: () => {
    set({ penaltyCountdown: null });
  },

  setPenalized: () => {
    set({ penalized: true, penaltyCountdown: null });
  },

  setPenaltyCountdown: (n: number | null) => {
    set({ penaltyCountdown: n });
  },

  toggleMiniPlayer: () => {
    set((state) => ({ isMiniPlayer: !state.isMiniPlayer }));
  },

  setTargetMinutes: (m: number) => {
    set({ targetMinutes: m });
  },
}));
