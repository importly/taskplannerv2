import { create } from "zustand";

interface SessionStore {
  selectedTagIds: string[];
  linkedGoalId: string | null;
  journalContent: string;
  isManualSessionOpen: boolean;
  manualDurationMinutes: number;

  setTags: (ids: string[]) => void;
  setGoal: (id: string | null) => void;
  setJournal: (content: string) => void;
  openManualSession: () => void;
  closeManualSession: () => void;
  setManualDurationMinutes: (minutes: number) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  selectedTagIds: [],
  linkedGoalId: null,
  journalContent: "",
  isManualSessionOpen: false,
  manualDurationMinutes: 25,

  setTags: (ids: string[]) => set({ selectedTagIds: ids }),
  setGoal: (id: string | null) => set({ linkedGoalId: id }),
  setJournal: (content: string) => set({ journalContent: content }),
  openManualSession: () => set({ isManualSessionOpen: true, manualDurationMinutes: 25 }),
  closeManualSession: () => set({ isManualSessionOpen: false }),
  setManualDurationMinutes: (minutes: number) => {
    const safeMinutes = Number.isFinite(minutes) ? Math.max(1, Math.min(600, Math.round(minutes))) : 1;
    set({ manualDurationMinutes: safeMinutes });
  },
  reset: () =>
    set({
      selectedTagIds: [],
      linkedGoalId: null,
      journalContent: "",
      isManualSessionOpen: false,
      manualDurationMinutes: 25,
    }),
}));
