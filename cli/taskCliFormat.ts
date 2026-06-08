import type { CachedTask } from "../src/tasks/taskRepository";

export type TaskTableOptions = {
  syncedLabel?: string;
  listNames?: Record<string, string | null | undefined>;
};

const GOAL_WIDTH = 30;

function sanitize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortId(id: string): string {
  return sanitize(id).slice(0, 6);
}

function pad(value: string, width: number): string {
  const clean = sanitize(value);
  if (clean.length > width) return `${clean.slice(0, width - 3).trimEnd()}...`;
  return clean.padEnd(width, " ");
}

function dueLabel(value: string | null): string {
  return value ? sanitize(value).slice(0, 10) : "-";
}

function goalLabel(task: CachedTask): string {
  return sanitize(task.linked_goal_title || task.linked_goal_id || "-");
}

function listLabel(task: CachedTask, options: TaskTableOptions): string {
  if (!task.list_id) return "Tasks";
  return sanitize(options.listNames?.[task.list_id] || task.list_id);
}

export function formatTaskTable(tasks: CachedTask[], options: TaskTableOptions = {}): string {
  const lines: string[] = [];
  if (options.syncedLabel) lines.push(sanitize(options.syncedLabel), "");

  if (tasks.length === 0) {
    lines.push("No tasks.");
    return lines.join("\n");
  }

  const groups = new Map<string, CachedTask[]>();
  for (const task of tasks) {
    const group = listLabel(task, options);
    groups.set(group, [...(groups.get(group) ?? []), task]);
  }

  for (const [listName, rows] of groups) {
    lines.push(listName);
    lines.push(`  ${pad("ID", 9)}${pad("Due", 12)}${pad("Goal", GOAL_WIDTH)}Task`);

    for (const task of rows) {
      lines.push(
        `  ${pad(shortId(task.ms_task_id), 9)}${pad(dueLabel(task.due_date), 12)}${pad(goalLabel(task), GOAL_WIDTH)}${sanitize(task.title)}`,
      );
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function formatMutationSuccess(action: string, task: CachedTask, options: TaskTableOptions = {}): string {
  return [`OK  ${sanitize(action)}`, "", formatTaskTable([task], options)].join("\n");
}

export function formatError(message: string): string {
  return `ERROR  ${sanitize(message)}`;
}
