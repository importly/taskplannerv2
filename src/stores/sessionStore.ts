import { create } from "zustand";

interface SessionStore {
  selectedTagIds: string[];
  linkedGoalId: string | null;
  journalContent: string;

  setTags: (ids: string[]) => void;
  setGoal: (id: string | null) => void;
  setJournal: (content: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  selectedTagIds: [],
  linkedGoalId: null,
  journalContent: "",

  setTags: (ids: string[]) => set({ selectedTagIds: ids }),
  setGoal: (id: string | null) => set({ linkedGoalId: id }),
  setJournal: (content: string) => set({ journalContent: content }),
  reset: () =>
    set({
      selectedTagIds: [],
      linkedGoalId: null,
      journalContent: "",
    }),
}));
