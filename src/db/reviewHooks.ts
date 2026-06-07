import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDb } from "./index";
import {
  buildWeeklyReviewMarkdown,
  computeMetricPeriodCounts,
  computeProjectHealth,
  formatEvidenceType,
  getWeekBounds,
  type GoalMetricCadence,
  type GoalMetricUnit,
} from "../lib/weeklyReview";

export const reviewKeys = {
  all: ["weekly-review"] as const,
  draft: (weekStartKey: string) => [...reviewKeys.all, "draft", weekStartKey] as const,
  metrics: () => [...reviewKeys.all, "metrics"] as const,
};

export interface GoalMetricInput {
  name: string;
  unit: GoalMetricUnit;
  cadence: GoalMetricCadence;
  target: number;
  linked_project_id?: string | null;
}

export interface MetricLogInput {
  metric_id: string;
  amount: number;
  note?: string | null;
}

export interface WeeklyReviewInput {
  weekStartKey: string;
  weekEndKey: string;
  biggestBlocker: string;
  nextWeekTopThree: string[];
  markdownSnapshot: string;
}

export function useGoalMetrics() {
  return useQuery({
    queryKey: reviewKeys.metrics(),
    queryFn: async () => {
      const db = getDb();
      return await db
        .selectFrom("goal_metrics")
        .selectAll()
        .where("archived_at", "is", null)
        .orderBy("created_at", "desc")
        .execute();
    },
  });
}

export function useCreateGoalMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metric: GoalMetricInput) => {
      const db = getDb();
      await db
        .insertInto("goal_metrics")
        .values({
          id: crypto.randomUUID(),
          name: metric.name.trim(),
          unit: metric.unit,
          cadence: metric.cadence,
          target: metric.target,
          linked_project_id: metric.linked_project_id ?? null,
          archived_at: null,
        })
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

export function useArchiveGoalMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const db = getDb();
      await db
        .updateTable("goal_metrics")
        .set({ archived_at: new Date().toISOString() })
        .where("id", "=", id)
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

export function useLogGoalMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MetricLogInput) => {
      const db = getDb();
      await db
        .insertInto("goal_metric_logs")
        .values({
          id: crypto.randomUUID(),
          metric_id: input.metric_id,
          amount: input.amount,
          note: nullIfBlank(input.note),
        })
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

export function useWeeklyReviewDraft(date = new Date()) {
  const bounds = getWeekBounds(date);

  return useQuery({
    queryKey: reviewKeys.draft(bounds.weekStartKey),
    queryFn: async () => {
      const db = getDb();
      const [projects, allSessions, metrics, metricLogs, savedReview] = await Promise.all([
        db.selectFrom("projects").selectAll().execute(),
        db
          .selectFrom("focus_sessions")
          .select([
            "id",
            "start_time",
            "focus_duration_seconds",
            "linked_project_id",
            "evidence_type",
            "evidence_url",
            "evidence_note",
          ])
          .execute(),
        db
          .selectFrom("goal_metrics")
          .selectAll()
          .where("archived_at", "is", null)
          .execute(),
        db.selectFrom("goal_metric_logs").selectAll().execute(),
        db
          .selectFrom("weekly_reviews")
          .selectAll()
          .where("week_start", "=", bounds.weekStartKey)
          .executeTakeFirst(),
      ]);

      const projectMap = new Map(projects.map((project) => [project.id, project]));
      const weekSessions = allSessions.filter((session) => (
        session.start_time >= bounds.weekStartIso && session.start_time <= bounds.weekEndIso
      ));
      const touchedProjectIds = new Set(
        weekSessions
          .map((session) => session.linked_project_id)
          .filter((id): id is string => Boolean(id))
      );
      const projectsTouched = Array.from(touchedProjectIds)
        .map((id) => projectMap.get(id)?.name)
        .filter((name): name is string => Boolean(name));
      const projectsNeglected = projects
        .filter((project) => project.status === "active" && !touchedProjectIds.has(project.id))
        .map((project) => project.name);
      const focusMinutes = weekSessions.reduce((sum, session) => sum + session.focus_duration_seconds / 60, 0);
      const metricCounts = computeMetricPeriodCounts(metrics, metricLogs, date);
      const evidence = weekSessions
        .filter((session) => session.evidence_type && session.evidence_type !== "no_artifact")
        .map((session) => ({
          projectName: session.linked_project_id ? projectMap.get(session.linked_project_id)?.name ?? "Unlinked project" : "Unlinked project",
          evidenceType: session.evidence_type ?? "no_artifact",
          evidenceUrl: session.evidence_url,
          evidenceNote: session.evidence_note,
        }));
      const biggestBlocker = savedReview?.biggest_blocker ?? "";
      const nextWeekTopThree = parseStringArray(savedReview?.next_week_top_three);
      const markdown = buildWeeklyReviewMarkdown({
        weekStartKey: bounds.weekStartKey,
        weekEndKey: bounds.weekEndKey,
        focusSessionCount: weekSessions.length,
        focusMinutes,
        projectsTouched,
        projectsNeglected,
        metrics: metricCounts,
        evidence,
        biggestBlocker,
        nextWeekTopThree,
      });

      return {
        bounds,
        health: computeProjectHealth(projects, allSessions),
        focusSessionCount: weekSessions.length,
        focusMinutes,
        projectsTouched,
        projectsNeglected,
        metrics: metricCounts,
        evidence,
        biggestBlocker,
        nextWeekTopThree,
        markdown,
        savedReview,
      };
    },
  });
}

export function useSaveWeeklyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WeeklyReviewInput) => {
      const db = getDb();
      const values = {
        id: crypto.randomUUID(),
        week_start: input.weekStartKey,
        week_end: input.weekEndKey,
        biggest_blocker: nullIfBlank(input.biggestBlocker),
        next_week_top_three: JSON.stringify(input.nextWeekTopThree.filter((item) => item.trim()).map((item) => item.trim())),
        markdown_snapshot: input.markdownSnapshot,
        updated_at: new Date().toISOString(),
      };

      await db
        .insertInto("weekly_reviews")
        .values(values)
        .onConflict((oc) =>
          oc.column("week_start").doUpdateSet({
            week_end: values.week_end,
            biggest_blocker: values.biggest_blocker,
            next_week_top_three: values.next_week_top_three,
            markdown_snapshot: values.markdown_snapshot,
            updated_at: values.updated_at,
          })
        )
        .execute();
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.draft(input.weekStartKey) });
    },
  });
}

export function evidenceLabel(type: string | null | undefined): string {
  return type ? formatEvidenceType(type) : "no artifact";
}

function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return ["", "", ""];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return ["", "", ""];
    return [...parsed.filter((item): item is string => typeof item === "string"), "", "", ""].slice(0, 3);
  } catch {
    return ["", "", ""];
  }
}
