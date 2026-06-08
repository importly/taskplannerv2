import type { Kysely } from "kysely";
import { getDb, type DatabaseSchema } from "./index";
import type { TaskRepository } from "../tasks/taskRepository";
import type {
  CachedTask,
  CachedTaskPatch,
  CachedTaskUpsert,
  GoalRefResult,
  GoalRow,
  TaskRefResult,
} from "../tasks/taskTypes";

const TASK_UPSERT_CHUNK_SIZE = 50;
const DELETE_TASK_CHUNK_SIZE = 200;

function resolveTaskRef(tasks: CachedTask[], ref: string): TaskRefResult {
  const normalizedRef = ref.trim();
  if (!normalizedRef) return { kind: "missing", matches: [] };
  const normalizedTitleRef = normalizedRef.toLowerCase();
  const matches = tasks.filter(
    (task) => task.ms_task_id.startsWith(normalizedRef) || task.title.trim().toLowerCase() === normalizedTitleRef,
  );

  if (matches.length === 1) return { kind: "found", task: matches[0] };
  if (matches.length > 1) return { kind: "ambiguous", matches };
  return { kind: "missing", matches: [] };
}

function resolveGoalRef(goals: GoalRow[], ref: string): GoalRefResult {
  const normalizedRef = ref.trim();
  if (!normalizedRef) return { kind: "missing", matches: [] };
  const normalizedTitleRef = normalizedRef.toLowerCase();
  const matches = goals.filter(
    (goal) => goal.id === normalizedRef || goal.title.trim().toLowerCase() === normalizedTitleRef,
  );

  if (matches.length === 1) return { kind: "found", goal: matches[0] };
  if (matches.length > 1) return { kind: "ambiguous", matches };
  return { kind: "missing", matches: [] };
}

export function createTauriTaskRepository(db: Kysely<DatabaseSchema> = getDb()): TaskRepository {
  return {
    async listCachedTasks(): Promise<CachedTask[]> {
      return db
        .selectFrom("cached_tasks")
        .leftJoin("goals", "goals.id", "cached_tasks.linked_goal_id")
        .select([
          "cached_tasks.ms_task_id",
          "cached_tasks.title",
          "cached_tasks.body",
          "cached_tasks.status",
          "cached_tasks.due_date",
          "cached_tasks.list_id",
          "cached_tasks.linked_goal_id",
          "goals.title as linked_goal_title",
        ])
        .orderBy("cached_tasks.due_date", "asc")
        .execute();
    },

    async listGoals(): Promise<GoalRow[]> {
      return db.selectFrom("goals").select(["id", "title"]).where("archived_at", "is", null).execute();
    },

    async upsertTasks(tasks: CachedTaskUpsert[]): Promise<void> {
      for (let i = 0; i < tasks.length; i += TASK_UPSERT_CHUNK_SIZE) {
        const chunk = tasks.slice(i, i + TASK_UPSERT_CHUNK_SIZE);
        if (chunk.length === 0) continue;

        await db
          .insertInto("cached_tasks")
          .values(chunk)
          .onConflict((oc) =>
            oc.column("ms_task_id").doUpdateSet((eb) => ({
              title: eb.ref("excluded.title"),
              body: eb.ref("excluded.body"),
              status: eb.ref("excluded.status"),
              due_date: eb.ref("excluded.due_date"),
              list_id: eb.ref("excluded.list_id"),
            })),
          )
          .execute();
      }
    },

    async updateTask(taskId: string, fields: CachedTaskPatch): Promise<void> {
      if (Object.keys(fields).length === 0) return;

      await db.updateTable("cached_tasks").set(fields).where("ms_task_id", "=", taskId).execute();
    },

    async deleteTask(taskId: string): Promise<void> {
      await db.deleteFrom("cached_tasks").where("ms_task_id", "=", taskId).execute();
    },

    async deleteTasksNotIn(taskIds: string[]): Promise<number> {
      const cachedTasks = await db.selectFrom("cached_tasks").select("ms_task_id").execute();
      const remoteTaskIds = new Set(taskIds);
      const taskIdsToDelete =
        taskIds.length === 0
          ? cachedTasks.map((task) => task.ms_task_id)
          : cachedTasks.filter((task) => !remoteTaskIds.has(task.ms_task_id)).map((task) => task.ms_task_id);

      for (let i = 0; i < taskIdsToDelete.length; i += DELETE_TASK_CHUNK_SIZE) {
        const chunk = taskIdsToDelete.slice(i, i + DELETE_TASK_CHUNK_SIZE);
        if (chunk.length === 0) continue;

        await db.deleteFrom("cached_tasks").where("ms_task_id", "in", chunk).execute();
      }

      return taskIdsToDelete.length;
    },

    async linkTaskToGoal(taskId: string, goalId: string): Promise<void> {
      await db
        .updateTable("cached_tasks")
        .set({ linked_goal_id: goalId })
        .where("ms_task_id", "=", taskId)
        .execute();
    },

    async unlinkTaskFromGoal(taskId: string): Promise<void> {
      await db
        .updateTable("cached_tasks")
        .set({ linked_goal_id: null })
        .where("ms_task_id", "=", taskId)
        .execute();
    },

    async findTaskRef(ref: string): Promise<TaskRefResult> {
      return resolveTaskRef(await this.listCachedTasks(), ref);
    },

    async findGoalRef(ref: string): Promise<GoalRefResult> {
      return resolveGoalRef(await this.listGoals(), ref);
    },
  };
}
