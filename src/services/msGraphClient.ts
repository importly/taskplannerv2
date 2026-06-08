import { Client } from "@microsoft/microsoft-graph-client";
import type { TodoTask, TodoTaskList } from "microsoft-graph";

type TokenProvider = () => Promise<string | null>;

export type GraphRequest = {
  filter(value: string): GraphRequest;
  get(): Promise<{ value: unknown[] }>;
  post(payload: unknown): Promise<unknown>;
  patch(payload: unknown): Promise<void>;
  delete(): Promise<void>;
};

export type GraphApiClient = {
  api(path: string): GraphRequest;
};

export type GraphClientFactory = (token: string) => GraphApiClient;

export type CreateTaskInput = {
  title: string;
  dueDate?: string;
  body?: string;
};

export type UpdateTaskInput = Partial<TodoTask>;

export type MsGraphTaskClient = {
  fetchTodoLists(): Promise<TodoTaskList[]>;
  fetchTasksForList(listId: string): Promise<TodoTask[]>;
  createTask(listId: string, input: CreateTaskInput): Promise<TodoTask>;
  updateTask(listId: string, taskId: string, fields: UpdateTaskInput): Promise<void>;
  completeTask(listId: string, taskId: string): Promise<void>;
  deleteTask(listId: string, taskId: string): Promise<void>;
};

export class MicrosoftAccountNotConnectedError extends Error {
  constructor() {
    super("Microsoft account is not connected");
    this.name = "MicrosoftAccountNotConnectedError";
  }
}

function createDefaultGraphClient(token: string): GraphApiClient {
  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}

function toCreatePayload(input: CreateTaskInput): TodoTask {
  return {
    title: input.title,
    dueDateTime: input.dueDate ? { dateTime: input.dueDate, timeZone: "UTC" } : undefined,
    body: input.body ? { content: input.body, contentType: "text" } : undefined,
  };
}

function graphErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const record = error as { statusCode?: unknown; status?: unknown };
  return record.statusCode ?? record.status;
}

export function createMsGraphClient(
  acquireToken: TokenProvider,
  createClient: GraphClientFactory = createDefaultGraphClient,
): MsGraphTaskClient {
  async function getClient() {
    const token = await acquireToken();
    if (!token) throw new MicrosoftAccountNotConnectedError();
    return createClient(token);
  }

  return {
    async fetchTodoLists() {
      const client = await getClient();
      const response = await client.api("/me/todo/lists").get();
      return response.value as TodoTaskList[];
    },

    async fetchTasksForList(listId) {
      const client = await getClient();
      const response = await client
        .api(`/me/todo/lists/${listId}/tasks`)
        .filter("status ne 'completed'")
        .get();
      return response.value as TodoTask[];
    },

    async createTask(listId, input) {
      const client = await getClient();
      return (await client.api(`/me/todo/lists/${listId}/tasks`).post(toCreatePayload(input))) as TodoTask;
    },

    async updateTask(listId, taskId, fields) {
      const client = await getClient();
      await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`).patch(fields);
    },

    async completeTask(listId, taskId) {
      const client = await getClient();
      await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`).patch({ status: "completed" });
    },

    async deleteTask(listId, taskId) {
      const client = await getClient();
      try {
        await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`).delete();
      } catch (error: unknown) {
        if (graphErrorStatus(error) !== 404) throw error;
      }
    },
  };
}
