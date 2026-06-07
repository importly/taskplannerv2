import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type TimerStatus = "IDLE" | "ACTIVE" | "PAUSED" | "STOPPED";
export type TimerMode = "countdown" | "stopwatch";

interface TimerStore {
  // State machine
  status: TimerStatus;
  timerMode: TimerMode;

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
  stoppedAt: number | null;          // Date.now() when STOPPED was called

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
  setTimerMode: (mode: TimerMode) => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
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

  start: () => {
    if (get().status !== "IDLE") return;
    set({
      status: "ACTIVE",
      startTime: Date.now(),
      penalized: false,
      penaltyCountdown: null,
      focusElapsedSeconds: 0,
      breakElapsedSeconds: 0,
      stoppedAt: null,
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
      stoppedAt: now,
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
      stoppedAt: null,
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
      stoppedAt: null,
    });
  },

  tick: () => {
    /* 
     * NOTE: Penalize functionality is currently disabled as it is broken.
     * The logic below is commented out to prevent accidental penalties.
     */
    /*
    const { status, penaltyCountdown, setPenalized } = get();
    if (status === "ACTIVE" && penaltyCountdown !== null) {
      if (penaltyCountdown > 0) {
        set({ penaltyCountdown: penaltyCountdown - 1 });
      } else {
        setPenalized();
      }
    }
    */
  },

  handleBlur: () => {
    /* 
     * NOTE: Penalize functionality is currently disabled as it is broken.
     */
    /*
    const { status, penalized } = get();
    if (status === "ACTIVE" && !penalized) {
      set({ penaltyCountdown: 15 });
    }
    */
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

  setTimerMode: (mode: TimerMode) => {
    if (get().status !== "IDLE") return;
    set({ timerMode: mode });
  },
}));

// --- Phone view: push timer state + task list to the local HTTP/WS server ---
// Mirrors the timer to phones on the same Wi-Fi via the Rust-side phone_view
// server. We push whenever state changes AND on a 1-second tick while ACTIVE
// (so the phone clock keeps counting down). Pushes are throttled to ~once
// per 250ms via a trailing-edge timer.

// Tasks are fed in from React via setPhoneTasks (the timer store has no DB
// access here). Module-local cache so computeSnapshot stays sync.
let phoneTasks: string[] = [];
export function setPhoneTasks(t: string[]) {
  phoneTasks = t.slice(0, 5);
  pushPhoneSnapshot();
}

let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let lastSentAt = 0;
const MIN_INTERVAL_MS = 250;

const computeSnapshot = () => {
  const s = useTimerStore.getState();
  const targetSeconds = s.targetMinutes * 60;
  let liveFocus = s.focusElapsedSeconds;
  if (s.status === "ACTIVE" && s.startTime) {
    liveFocus += (Date.now() - s.startTime) / 1000;
  }
  const remainingSeconds = Math.max(0, targetSeconds - liveFocus);
  return {
    status: s.status,
    timerMode: s.timerMode,
    elapsedSeconds: Math.floor(liveFocus),
    remainingSeconds: Math.floor(remainingSeconds),
    targetSeconds,
    tasks: phoneTasks,
  };
};

function pushPhoneSnapshot() {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastSentAt));
  if (throttleTimer) return;
  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    lastSentAt = Date.now();
    try {
      invoke("push_timer_state", { payload: computeSnapshot() }).catch(() => {});
    } catch {
      /* not running inside Tauri */
    }
  }, wait);
}

useTimerStore.subscribe(() => pushPhoneSnapshot());

if (typeof window !== "undefined") {
  setInterval(() => {
    const status = useTimerStore.getState().status;
    if (status === "ACTIVE") pushPhoneSnapshot();
  }, 1000);
}
