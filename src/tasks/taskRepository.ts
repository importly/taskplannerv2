import type {
  CachedTask,
  CachedTaskPatch,
  CachedTaskUpsert,
  GoalRefResult,
  GoalRow,
  TaskRefResult,
} from "./taskTypes";

export type {
  CachedTask,
  CachedTaskPatch,
  CachedTaskRow,
  CachedTaskUpsert,
  GoalRefResult,
  GoalRow,
  TaskListRow,
  TaskRefResult,
} from "./taskTypes";

export type TaskRepository = {
  listCachedTasks(): Promise<CachedTask[]>;
  listGoals(): Promise<GoalRow[]>;
  upsertTasks(tasks: CachedTaskUpsert[]): Promise<void>;
  updateTask(taskId: string, fields: CachedTaskPatch): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  deleteTasksNotIn(taskIds: string[]): Promise<number>;
  linkTaskToGoal(taskId: string, goalId: string): Promise<void>;
  unlinkTaskFromGoal(taskId: string): Promise<void>;
  findTaskRef(ref: string): Promise<TaskRefResult>;
  findGoalRef(ref: string): Promise<GoalRefResult>;
};
