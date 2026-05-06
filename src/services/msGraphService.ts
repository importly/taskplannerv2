import { Client } from "@microsoft/microsoft-graph-client";
import { acquireMsToken } from "./msalAuth";
import type { TodoTask, TodoTaskList } from "microsoft-graph";

async function getAuthenticatedClient() {
  const token = await acquireMsToken();
  if (!token) throw new Error("Not authenticated");
  
  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

export async function fetchTodoLists(): Promise<TodoTaskList[]> {
  const client = await getAuthenticatedClient();
  const response = await client.api("/me/todo/lists").get();
  return response.value;
}

export async function fetchTasksForList(listId: string): Promise<TodoTask[]> {
  const client = await getAuthenticatedClient();
  const response = await client.api(`/me/todo/lists/${listId}/tasks`)
    .filter("status ne 'completed'")
    .get();
  return response.value;
}

export async function completeTask(listId: string, taskId: string): Promise<void> {
  const client = await getAuthenticatedClient();
  await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`)
    .patch({ status: "completed" });
}

export async function updateTask(listId: string, taskId: string, fields: Partial<TodoTask>): Promise<void> {
  const client = await getAuthenticatedClient();
  await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`)
    .patch(fields);
}

export async function createTask(listId: string, title: string, dueDate?: string): Promise<TodoTask> {
  const client = await getAuthenticatedClient();
  const task: TodoTask = {
    title,
    dueDateTime: dueDate ? { dateTime: dueDate, timeZone: "UTC" } : undefined,
  };
  return await client.api(`/me/todo/lists/${listId}/tasks`).post(task);
}
