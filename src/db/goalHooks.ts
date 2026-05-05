import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDb } from "./index";
import { 
  createGoal, 
  updateGoal, 
  archiveGoal, 
  deleteGoal, 
  updateGoalProgress, 
  addManualNarrativeLog 
} from "./operations";
import { sql } from "kysely";

export const goalKeys = {
  all: ["goals"] as const,
  lists: () => [...goalKeys.all, "list"] as const,
  list: (archived: boolean) => [...goalKeys.lists(), { archived }] as const,
  details: () => [...goalKeys.all, "detail"] as const,
  detail: (id: string) => [...goalKeys.details(), id] as const,
  stats: (id: string) => [...goalKeys.detail(id), "stats"] as const,
  logs: (id: string) => [...goalKeys.detail(id), "logs"] as const,
};

export function useGoals() {
  return useQuery({
    queryKey: goalKeys.list(false),
    queryFn: async () => {
      const db = getDb();
      return await db
        .selectFrom("goals")
        .selectAll()
        .where("archived_at", "is", null)
        .orderBy("created_at", "desc")
        .execute();
    },
  });
}

export function useGoalsWithStats() {
  return useQuery({
    queryKey: [...goalKeys.lists(), "with-stats", false],
    queryFn: async () => {
      const db = getDb();
      const goals = await db
        .selectFrom("goals")
        .selectAll()
        .where("archived_at", "is", null)
        .orderBy("created_at", "desc")
        .execute();

      const stats = await db
        .selectFrom("focus_sessions")
        .select([
          "linked_goal_id",
          sql<number>`SUM(focus_duration_seconds)`.as("total_seconds"),
        ])
        .where("linked_goal_id", "is not", null)
        .groupBy("linked_goal_id")
        .execute();

      const statsMap = new Map(stats.map(s => [s.linked_goal_id, s.total_seconds]));

      return goals.map(goal => ({
        ...goal,
        total_focus_seconds: statsMap.get(goal.id) || 0,
      }));
    },
  });
}

export function useArchivedGoalsWithStats() {
  return useQuery({
    queryKey: [...goalKeys.lists(), "with-stats", true],
    queryFn: async () => {
      const db = getDb();
      const goals = await db
        .selectFrom("goals")
        .selectAll()
        .where("archived_at", "is not", null)
        .orderBy("archived_at", "desc")
        .execute();

      const stats = await db
        .selectFrom("focus_sessions")
        .select([
          "linked_goal_id",
          sql<number>`SUM(focus_duration_seconds)`.as("total_seconds"),
        ])
        .where("linked_goal_id", "is not", null)
        .groupBy("linked_goal_id")
        .execute();

      const statsMap = new Map(stats.map(s => [s.linked_goal_id, s.total_seconds]));

      return goals.map(goal => ({
        ...goal,
        total_focus_seconds: statsMap.get(goal.id) || 0,
      }));
    },
  });
}

export function useGlobalStats() {
  return useQuery({
    queryKey: [...goalKeys.all, "global-stats"],
    queryFn: async () => {
      const db = getDb();
      // Total focus time this week (Monday to now)
      const weekStats = await db
        .selectFrom("focus_sessions")
        .select(sql<number>`SUM(focus_duration_seconds)`.as("total_seconds"))
        .where("start_time", ">=", sql<string>`date('now', 'weekday 0', '-6 days')`) // Start of current week (Monday)
        .executeTakeFirst();

      return {
        focus_seconds_this_week: weekStats?.total_seconds || 0,
      };
    },
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: async () => {
      const db = getDb();
      return await db
        .selectFrom("goals")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },
    enabled: !!id,
  });
}

export function useGoalStats(id: string) {
  return useQuery({
    queryKey: goalKeys.stats(id),
    queryFn: async () => {
      const db = getDb();
      // Calculate stats for the last 14 days
      // SQLite: date(start_time) gives YYYY-MM-DD
      const stats = await db
        .selectFrom("focus_sessions")
        .select([
          sql<string>`date(start_time)`.as("date"),
          sql<number>`SUM(focus_duration_seconds) / 60.0`.as("total_minutes"),
        ])
        .where("linked_goal_id", "=", id)
        .where("start_time", ">=", sql<string>`date('now', '-14 days')`)
        .groupBy(sql`date(start_time)`)
        .orderBy(sql`date(start_time)`, "asc")
        .execute();
      
      return stats;
    },
    enabled: !!id,
  });
}

export function useNarrativeLogs(goalId: string) {
  return useQuery({
    queryKey: goalKeys.logs(goalId),
    queryFn: async () => {
      const db = getDb();
      return await db
        .selectFrom("narrative_logs")
        .selectAll()
        .where("goal_id", "=", goalId)
        .orderBy("timestamp", "desc")
        .execute();
    },
    enabled: !!goalId,
  });
}

// Mutation Hooks

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, description }: { title: string; description: string | null }) => 
      createGoal(title, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title, description }: { id: string; title: string; description: string | null }) => 
      updateGoal(id, title, description),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useArchiveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveGoal(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, progressPercent }: { id: string; progressPercent: number }) => 
      updateGoalProgress(id, progressPercent),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useAddManualNarrativeLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, content }: { goalId: string; content: string }) => 
      addManualNarrativeLog(goalId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.logs(variables.goalId) });
    },
  });
}
