import { acquireMsToken } from "./msalAuth";
import type { TodoTask, TodoTaskList } from "microsoft-graph";
import { createMsGraphClient } from "./msGraphClient";

const graphClient = createMsGraphClient(acquireMsToken);

export async function fetchTodoLists(): Promise<TodoTaskList[]> {
  return graphClient.fetchTodoLists();
}

export async function fetchTasksForList(listId: string): Promise<TodoTask[]> {
  return graphClient.fetchTasksForList(listId);
}

export async function completeTask(listId: string, taskId: string): Promise<void> {
  await graphClient.completeTask(listId, taskId);
}

export async function updateTask(listId: string, taskId: string, fields: Partial<TodoTask>): Promise<void> {
  await graphClient.updateTask(listId, taskId, fields);
}

export async function createTask(listId: string, title: string, dueDate?: string, body?: string): Promise<TodoTask> {
  return graphClient.createTask(listId, { title, dueDate, body });
}

export async function deleteTask(listId: string, taskId: string): Promise<void> {
  await graphClient.deleteTask(listId, taskId);
}
