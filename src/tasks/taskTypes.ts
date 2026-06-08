import type { CreateTaskInput, UpdateTaskInput } from "../services/msGraphClient";

export type CachedTask = {
  ms_task_id: string;
  title: string;
  body: string | null;
  status: string | null;
  due_date: string | null;
  list_id: string | null;
  linked_goal_id: string | null;
  linked_goal_title?: string | null;
};

export type CachedTaskRow = CachedTask;

export type CachedTaskUpsert = {
  ms_task_id: string;
  title: string;
  body: string | null;
  status: string | null;
  due_date: string | null;
  list_id: string | null;
  linked_goal_id: string | null;
};

export type TaskListRow = {
  id: string;
  displayName?: string | null;
};

export type GoalRow = {
  id: string;
  title: string;
};

export type TaskRefResult =
  | { kind: "found"; task: CachedTask }
  | { kind: "ambiguous"; matches: CachedTask[] }
  | { kind: "missing"; matches: [] };

export type GoalRefResult =
  | { kind: "found"; goal: GoalRow }
  | { kind: "ambiguous"; matches: GoalRow[] }
  | { kind: "missing"; matches: [] };

export type CachedTaskPatch = Partial<
  Pick<CachedTaskUpsert, "title" | "body" | "status" | "due_date" | "list_id" | "linked_goal_id">
>;

export type TaskRef = {
  taskId: string;
  listId: string;
};

export type GoalRef = {
  goalId: string;
};

export type TaskGoalRef = {
  taskId: string;
  goalId: string;
};

export type CreateCachedTaskInput = CreateTaskInput & {
  listId: string;
  linkedGoalId?: string | null;
};

export type UpdateCachedTaskInput = TaskRef & {
  fields: UpdateTaskInput;
};

export type TaskMutationResult = {
  taskId: string;
  title: string;
};

export type SyncStats = {
  listsFetched: number;
  tasksFetched: number;
  tasksUpserted: number;
  tasksDeleted: number;
};

export type SyncTasksStats = SyncStats;
