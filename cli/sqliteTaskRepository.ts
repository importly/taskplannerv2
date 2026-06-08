import { Database } from "bun:sqlite";
import type { TaskRepository } from "../src/tasks/taskRepository";
import type {
  CachedTask,
  CachedTaskPatch,
  CachedTaskUpsert,
  GoalRefResult,
  GoalRow,
  TaskRefResult,
} from "../src/tasks/taskTypes";

const TASK_UPSERT_CHUNK_SIZE = 50;
const DELETE_TASK_CHUNK_SIZE = 200;

type SqliteDatabase = Pick<Database, "query" | "transaction">;
type SqliteValue = string | number | bigint | boolean | null;

const TASK_PATCH_COLUMNS = ["title", "body", "status", "due_date", "list_id", "linked_goal_id"] as const;

export function openCliDb(dbPath: string): Database {
  const db = new Database(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

function openDatabase(dbOrPath: string | SqliteDatabase): SqliteDatabase {
  return typeof dbOrPath === "string" ? openCliDb(dbOrPath) : dbOrPath;
}

function rows<T>(db: SqliteDatabase, sql: string, params: SqliteValue[] = []): T[] {
  return db.query(sql).all(...params) as T[];
}

function run(db: SqliteDatabase, sql: string, params: SqliteValue[] = []): void {
  db.query(sql).run(...params);
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function placeholders(count: number): string {
  return Array(count).fill("?").join(", ");
}

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

export function createSqliteTaskRepository(dbOrPath: string | SqliteDatabase): TaskRepository {
  const db = openDatabase(dbOrPath);

  return {
    async listCachedTasks(): Promise<CachedTask[]> {
      return rows<CachedTask>(
        db,
        `
          SELECT
            cached_tasks.ms_task_id,
            cached_tasks.title,
            cached_tasks.body,
            cached_tasks.status,
            cached_tasks.due_date,
            cached_tasks.list_id,
            cached_tasks.linked_goal_id,
            goals.title AS linked_goal_title
          FROM cached_tasks
          LEFT JOIN goals ON goals.id = cached_tasks.linked_goal_id
          ORDER BY cached_tasks.due_date ASC
        `,
      );
    },

    async listGoals(): Promise<GoalRow[]> {
      return rows<GoalRow>(db, "SELECT id, title FROM goals WHERE archived_at IS NULL");
    },

    async upsertTasks(tasks: CachedTaskUpsert[]): Promise<void> {
      if (tasks.length === 0) return;

      const insertChunk = db.transaction((chunk: CachedTaskUpsert[]) => {
        for (const task of chunk) {
          run(
            db,
            `
              INSERT INTO cached_tasks (ms_task_id, title, body, status, due_date, list_id, linked_goal_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(ms_task_id) DO UPDATE SET
                title = excluded.title,
                body = excluded.body,
                status = excluded.status,
                due_date = excluded.due_date,
                list_id = excluded.list_id
            `,
            [task.ms_task_id, task.title, task.body, task.status, task.due_date, task.list_id, task.linked_goal_id],
          );
        }
      });

      for (const chunk of chunks(tasks, TASK_UPSERT_CHUNK_SIZE)) insertChunk(chunk);
    },

    async updateTask(taskId: string, fields: CachedTaskPatch): Promise<void> {
      const entries = TASK_PATCH_COLUMNS.flatMap((column) =>
        Object.hasOwn(fields, column) ? [[column, fields[column]] as const] : [],
      );
      if (entries.length === 0) return;

      const setClause = entries.map(([column]) => `${column} = ?`).join(", ");
      run(db, `UPDATE cached_tasks SET ${setClause} WHERE ms_task_id = ?`, [
        ...entries.map(([, value]) => value ?? null),
        taskId,
      ]);
    },

    async deleteTask(taskId: string): Promise<void> {
      run(db, "DELETE FROM cached_tasks WHERE ms_task_id = ?", [taskId]);
    },

    async deleteTasksNotIn(taskIds: string[]): Promise<number> {
      const cachedIds = rows<{ ms_task_id: string }>(db, "SELECT ms_task_id FROM cached_tasks").map(
        (task) => task.ms_task_id,
      );
      const remoteIds = new Set(taskIds);
      const taskIdsToDelete =
        taskIds.length === 0 ? cachedIds : cachedIds.filter((taskId) => !remoteIds.has(taskId));

      for (const chunk of chunks(taskIdsToDelete, DELETE_TASK_CHUNK_SIZE)) {
        if (chunk.length === 0) continue;
        run(db, `DELETE FROM cached_tasks WHERE ms_task_id IN (${placeholders(chunk.length)})`, chunk);
      }

      return taskIdsToDelete.length;
    },

    async linkTaskToGoal(taskId: string, goalId: string): Promise<void> {
      run(db, "UPDATE cached_tasks SET linked_goal_id = ? WHERE ms_task_id = ?", [goalId, taskId]);
    },

    async unlinkTaskFromGoal(taskId: string): Promise<void> {
      run(db, "UPDATE cached_tasks SET linked_goal_id = NULL WHERE ms_task_id = ?", [taskId]);
    },

    async findTaskRef(ref: string): Promise<TaskRefResult> {
      return resolveTaskRef(await this.listCachedTasks(), ref);
    },

    async findGoalRef(ref: string): Promise<GoalRefResult> {
      return resolveGoalRef(await this.listGoals(), ref);
    },
  };
}
