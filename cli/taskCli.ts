import { homedir } from "node:os";
import process from "node:process";
import type { TodoTaskList } from "microsoft-graph";
import { createMsGraphClient, type MsGraphTaskClient, type UpdateTaskInput } from "../src/services/msGraphClient";
import { createTaskOperations } from "../src/tasks/taskOperations";
import type { CachedTask } from "../src/tasks/taskRepository";
import { resolveAppDbPath } from "./dbPath";
import { acquireMsCliToken } from "./msCliAuth";
import { createSqliteTaskRepository } from "./sqliteTaskRepository";
import { formatError, formatMutationSuccess, formatTaskTable } from "./taskCliFormat";
import { parseTaskCliArgs, type TaskCliCommand } from "./taskCliParser";

const HELP = `Usage: bun run task -- <command> [options]

Commands:
  help                         Show this help.
  sync                         Sync Microsoft To Do into the local cache.
  list [--cached] [--all]      Show tasks. Syncs first unless --cached is used.
       [--due YYYY-MM-DD]
       [--goal GOAL]
  add "TITLE" [--list LIST]    Create a task.
      [--due YYYY-MM-DD]
      [--body TEXT]
      [--goal GOAL]
  edit TASK [--title TITLE]    Update title, due date, or body.
       [--due YYYY-MM-DD]
       [--body TEXT]
  done TASK                    Complete a task.
  delete TASK                  Delete a task.
  link TASK GOAL               Link a cached task to a goal.
  unlink TASK                  Remove a cached task goal link.

Task refs can be a task id prefix or exact task title. Goal refs can be a goal id or exact goal title.`;

type CliContext = {
  repository: ReturnType<typeof createSqliteTaskRepository>;
  graphClient: MsGraphTaskClient;
  operations: ReturnType<typeof createTaskOperations>;
};

export type TaskCliDeps = {
  createContext?: () => CliContext | Promise<CliContext>;
};

export type TaskCliResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

function getDbPath(): string {
  return resolveAppDbPath(process.env, process.platform, homedir());
}

function createCliContext(): CliContext {
  const dbPath = getDbPath();
  const repository = createSqliteTaskRepository(dbPath);
  const graphClient = createMsGraphClient(() => acquireMsCliToken(dbPath));
  const operations = createTaskOperations({
    repository,
    graphClient,
  });

  return { repository, graphClient, operations };
}

function listNamesById(lists: TodoTaskList[]): Record<string, string | null | undefined> {
  return Object.fromEntries(lists.flatMap((list) => (list.id ? [[list.id, list.displayName]] : [])));
}

function listLabel(list: TodoTaskList & { id: string }): string {
  return `${list.displayName || "(unnamed)"} (${list.id})`;
}

function listSummary(lists: Array<TodoTaskList & { id: string }>): string {
  return lists.map(listLabel).join(", ") || "none";
}

export function resolveListId(lists: TodoTaskList[], requestedList?: string): string {
  const usableLists = lists.filter((list): list is TodoTaskList & { id: string } => typeof list.id === "string");

  if (requestedList) {
    const byId = usableLists.find((list) => list.id === requestedList);
    if (byId) return byId.id;

    const normalizedName = requestedList.trim().toLowerCase();
    const byName = usableLists.filter((list) => (list.displayName || "").trim().toLowerCase() === normalizedName);
    if (byName.length === 1) return byName[0].id;
    if (byName.length > 1) {
      throw new Error(`Task list "${requestedList}" is ambiguous. Matching lists: ${listSummary(byName)}. Use --list with a list id.`);
    }

    throw new Error(`Task list "${requestedList}" was not found. Available lists: ${listSummary(usableLists)}.`);
  }

  const tasksLists = usableLists.filter((list) => list.displayName === "Tasks");
  if (tasksLists.length === 1) return tasksLists[0].id;
  if (tasksLists.length > 1) {
    throw new Error(`Default task list is ambiguous. Matching lists: ${listSummary(tasksLists)}. Use --list with a list id.`);
  }

  if (usableLists.length === 1) return usableLists[0].id;

  throw new Error(`Missing --list. Available lists: ${listSummary(usableLists)}.`);
}

function requireFoundTask(result: Awaited<ReturnType<CliContext["repository"]["findTaskRef"]>>, ref: string): CachedTask {
  if (result.kind === "found") return result.task;
  if (result.kind === "ambiguous") throw new Error(`Task reference "${ref}" is ambiguous.`);
  throw new Error(`Task reference "${ref}" was not found.`);
}

async function resolveGoalId(context: CliContext, ref: string): Promise<string> {
  const result = await context.repository.findGoalRef(ref);
  if (result.kind === "found") return result.goal.id;
  if (result.kind === "ambiguous") throw new Error(`Goal reference "${ref}" is ambiguous.`);
  throw new Error(`Goal reference "${ref}" was not found.`);
}

function requireListId(task: CachedTask): string {
  if (task.list_id) return task.list_id;
  throw new Error("Task is missing list id. Run sync and try again.");
}

function filterTasks(tasks: CachedTask[], command: Extract<TaskCliCommand, { command: "list" }>): CachedTask[] {
  return tasks.filter((task) => {
    if (!command.all && task.status === "completed") return false;
    if (command.due && (task.due_date || "").slice(0, 10) !== command.due) return false;
    if (command.goal) {
      const goalRef = command.goal.trim().toLowerCase();
      const goalId = (task.linked_goal_id || "").trim().toLowerCase();
      const goalTitle = (task.linked_goal_title || "").trim().toLowerCase();
      if (goalId !== goalRef && goalTitle !== goalRef) return false;
    }
    return true;
  });
}

function updateFields(command: Extract<TaskCliCommand, { command: "edit" }>): UpdateTaskInput {
  const fields: UpdateTaskInput = {};
  if (command.title !== undefined) fields.title = command.title;
  if (command.body !== undefined) fields.body = { content: command.body, contentType: "text" };
  if (command.due !== undefined) fields.dueDateTime = { dateTime: command.due, timeZone: "UTC" };
  if (Object.keys(fields).length === 0) throw new Error("No edit fields provided.");
  return fields;
}

async function formatTaskAfterMutation(context: CliContext, action: string, taskId: string): Promise<string> {
  const task = requireFoundTask(await context.repository.findTaskRef(taskId), taskId);
  return formatMutationSuccess(action, task);
}

async function runCommand(command: TaskCliCommand, deps: TaskCliDeps = {}): Promise<string> {
  if (command.command === "help") {
    return HELP;
  }

  const context = await (deps.createContext ?? createCliContext)();

  if (command.command === "sync") {
    const stats = await context.operations.syncTasks();
    return `OK  Synced ${stats.tasksFetched} tasks from ${stats.listsFetched} lists; ${stats.tasksDeleted} removed from cache.`;
  }

  if (command.command === "list") {
    if (!command.cached) {
      await context.operations.syncTasks();
    }

    const tasks = filterTasks(await context.operations.listCachedTasks(), command);
    return formatTaskTable(tasks, { syncedLabel: command.cached ? "Cached tasks" : "Synced tasks" });
  }

  if (command.command === "add") {
    const lists = await context.graphClient.fetchTodoLists();
    const listId = resolveListId(lists, command.list);
    const linkedGoalId = command.goal ? await resolveGoalId(context, command.goal) : null;
    const task = await context.operations.createTask({
      title: command.title,
      dueDate: command.due,
      body: command.body,
      listId,
      linkedGoalId,
    });
    return formatMutationSuccess("Created task", task, { listNames: listNamesById(lists) });
  }

  if (command.command === "edit") {
    const task = requireFoundTask(await context.repository.findTaskRef(command.ref), command.ref);
    await context.operations.updateTask({ listId: requireListId(task), taskId: task.ms_task_id, fields: updateFields(command) });
    return formatTaskAfterMutation(context, "Updated task", task.ms_task_id);
  }

  if (command.command === "done") {
    const task = requireFoundTask(await context.repository.findTaskRef(command.ref), command.ref);
    await context.operations.completeTask({ listId: requireListId(task), taskId: task.ms_task_id });
    return formatMutationSuccess("Completed task", task);
  }

  if (command.command === "delete") {
    const task = requireFoundTask(await context.repository.findTaskRef(command.ref), command.ref);
    await context.operations.deleteTask({ listId: requireListId(task), taskId: task.ms_task_id });
    return formatMutationSuccess("Deleted task", task);
  }

  if (command.command === "link") {
    const task = requireFoundTask(await context.repository.findTaskRef(command.ref), command.ref);
    const goalId = await resolveGoalId(context, command.goal);
    await context.operations.linkTaskToGoal({ taskId: task.ms_task_id, goalId });
    return formatTaskAfterMutation(context, "Linked task", task.ms_task_id);
  }

  if (command.command === "unlink") {
    const task = requireFoundTask(await context.repository.findTaskRef(command.ref), command.ref);
    await context.operations.unlinkTaskFromGoal({ taskId: task.ms_task_id });
    return formatTaskAfterMutation(context, "Unlinked task", task.ms_task_id);
  }

  return "";
}

export async function runTaskCli(args: string[] = process.argv.slice(2), deps: TaskCliDeps = {}): Promise<TaskCliResult> {
  try {
    return {
      stdout: `${await runCommand(parseTaskCliArgs(args), deps)}\n`,
      stderr: "",
      exitCode: 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown task CLI error.";
    return {
      stdout: "",
      stderr: `${formatError(message)}\n`,
      exitCode: 1,
    };
  }
}

export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const result = await runTaskCli(args);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.exitCode !== 0) {
    process.exitCode = result.exitCode;
  }
}

if (import.meta.main) {
  await main();
}
