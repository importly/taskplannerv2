import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Updateable } from "kysely";
import { getDb } from "./index";
import type { DatabaseSchema } from "./types";
import {
  computeProjectHealth,
  type ProjectArea,
  type ProjectStatus,
} from "../lib/weeklyReview";

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  health: () => [...projectKeys.all, "health"] as const,
  todayPlan: (dateKey: string) => [...projectKeys.all, "today-plan", dateKey] as const,
};

export interface ProjectInput {
  name: string;
  area: ProjectArea;
  status?: ProjectStatus;
  current_milestone?: string | null;
  next_action?: string | null;
  target_review_cadence_days?: number;
  evidence_url?: string | null;
}

export interface ProjectUpdate extends Partial<ProjectInput> {
  id: string;
}

export interface TodayPlanInput {
  planDate?: string;
  primary_project_id: string | null;
  primary_action: string | null;
  success_evidence: string | null;
  secondary_items: string[];
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const db = getDb();
      return await db
        .selectFrom("projects")
        .selectAll()
        .orderBy("status", "asc")
        .orderBy("created_at", "desc")
        .execute();
    },
  });
}

export function useProjectHealth() {
  return useQuery({
    queryKey: projectKeys.health(),
    queryFn: async () => {
      const db = getDb();
      const [projects, sessions] = await Promise.all([
        db.selectFrom("projects").selectAll().execute(),
        db
          .selectFrom("focus_sessions")
          .select(["linked_project_id", "start_time", "evidence_type", "evidence_url", "evidence_note"])
          .where("linked_project_id", "is not", null)
          .execute(),
      ]);

      return computeProjectHealth(projects, sessions);
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: ProjectInput) => {
      const db = getDb();
      await db
        .insertInto("projects")
        .values({
          id: crypto.randomUUID(),
          name: project.name.trim(),
          area: project.area,
          status: project.status ?? "active",
          current_milestone: nullIfBlank(project.current_milestone),
          next_action: nullIfBlank(project.next_action),
          target_review_cadence_days: project.target_review_cadence_days ?? 7,
          evidence_url: nullIfBlank(project.evidence_url),
        })
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: ["weekly-review"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...fields }: ProjectUpdate) => {
      const db = getDb();
      const updateData: Updateable<DatabaseSchema["projects"]> = {
        updated_at: new Date().toISOString(),
      };

      if (fields.name !== undefined) updateData.name = fields.name.trim();
      if (fields.area !== undefined) updateData.area = fields.area;
      if (fields.status !== undefined) updateData.status = fields.status;
      if (fields.current_milestone !== undefined) updateData.current_milestone = nullIfBlank(fields.current_milestone);
      if (fields.next_action !== undefined) updateData.next_action = nullIfBlank(fields.next_action);
      if (fields.target_review_cadence_days !== undefined) {
        updateData.target_review_cadence_days = fields.target_review_cadence_days;
      }
      if (fields.evidence_url !== undefined) updateData.evidence_url = nullIfBlank(fields.evidence_url);

      await db
        .updateTable("projects")
        .set(updateData)
        .where("id", "=", id)
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: ["weekly-review"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const db = getDb();
      await db.deleteFrom("projects").where("id", "=", id).execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: ["weekly-review"] });
    },
  });
}

export function useTodayPlan(date = new Date()) {
  const planDate = toLocalDateKey(date);

  return useQuery({
    queryKey: projectKeys.todayPlan(planDate),
    queryFn: async () => {
      const db = getDb();
      const row = await db
        .selectFrom("daily_plans")
        .selectAll()
        .where("plan_date", "=", planDate)
        .executeTakeFirst();

      return {
        id: row?.id ?? null,
        plan_date: planDate,
        primary_project_id: row?.primary_project_id ?? null,
        primary_action: row?.primary_action ?? "",
        success_evidence: row?.success_evidence ?? "",
        secondary_items: parseSecondaryItems(row?.secondary_items),
      };
    },
  });
}

export function useUpsertTodayPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TodayPlanInput) => {
      const db = getDb();
      const planDate = input.planDate ?? toLocalDateKey();
      const values = {
        id: crypto.randomUUID(),
        plan_date: planDate,
        primary_project_id: input.primary_project_id,
        primary_action: nullIfBlank(input.primary_action),
        success_evidence: nullIfBlank(input.success_evidence),
        secondary_items: JSON.stringify(input.secondary_items.filter((item) => item.trim()).map((item) => item.trim())),
        updated_at: new Date().toISOString(),
      };

      await db
        .insertInto("daily_plans")
        .values(values)
        .onConflict((oc) =>
          oc.column("plan_date").doUpdateSet({
            primary_project_id: values.primary_project_id,
            primary_action: values.primary_action,
            success_evidence: values.success_evidence,
            secondary_items: values.secondary_items,
            updated_at: values.updated_at,
          })
        )
        .execute();
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.todayPlan(input.planDate ?? toLocalDateKey()) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function toLocalDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseSecondaryItems(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
