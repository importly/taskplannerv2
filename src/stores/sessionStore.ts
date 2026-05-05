import { create } from "zustand";

interface SessionStore {
  activeGoalId: string | null;
}

export const useSessionStore = create<SessionStore>(() => ({
  activeGoalId: null,
}));
