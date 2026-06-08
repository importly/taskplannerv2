import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TodoTask } from "microsoft-graph";
import { createMsGraphClient } from "../services/msGraphClient";
import { acquireMsToken } from "../services/msalAuth";
import { createTaskOperations, type TaskOperations } from "../tasks/taskOperations";
import type { CachedTask } from "../tasks/taskTypes";
import { createTauriTaskRepository } from "./tauriTaskRepository";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  cached: () => [...taskKeys.all, "cached"] as const,
};

function getTaskOperations(): TaskOperations {
  return createTaskOperations({
    repository: createTauriTaskRepository(),
    graphClient: createMsGraphClient(acquireMsToken),
  });
}

async function resolveTaskForMutation(
  operations: TaskOperations,
  taskId: string,
  fallbackListId?: string,
): Promise<{ taskId: string; listId: string }> {
  const normalizedRef = taskId.trim();
  const cachedTasks = await operations.listCachedTasks();
  const exactMatch = cachedTasks.find((task) => task.ms_task_id === normalizedRef);
  const matchingTask =
    exactMatch ??
    cachedTasks.find(
      (task) => task.ms_task_id.startsWith(normalizedRef) || task.title.trim().toLowerCase() === normalizedRef.toLowerCase(),
    );

  const resolvedTaskId = matchingTask?.ms_task_id ?? normalizedRef;
  const resolvedListId = matchingTask?.list_id ?? fallbackListId;
  if (!resolvedListId) {
    throw new Error(`Task ${taskId} does not have a Microsoft To Do list id`);
  }

  return { taskId: resolvedTaskId, listId: resolvedListId };
}

function invalidateCachedTasks(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: taskKeys.cached() });
}

export function useCachedTasks() {
  return useQuery({
    queryKey: taskKeys.cached(),
    queryFn: () => getTaskOperations().listCachedTasks(),
  });
}

export function useSyncTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getTaskOperations().syncTasks(),
    onSuccess: () => {
      invalidateCachedTasks(queryClient);
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, listId }: { taskId: string; listId?: string }) => {
      const operations = getTaskOperations();
      await operations.completeTask(await resolveTaskForMutation(operations, taskId, listId));
    },
    onSuccess: () => {
      invalidateCachedTasks(queryClient);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      listId,
      fields,
    }: {
      taskId: string;
      listId?: string;
      fields: Partial<TodoTask>;
    }) => {
      const operations = getTaskOperations();
      const taskRef = await resolveTaskForMutation(operations, taskId, listId);
      await operations.updateTask({ ...taskRef, fields });
    },
    onSuccess: () => {
      invalidateCachedTasks(queryClient);
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, title, dueDate, body, linkedGoalId }: {
      listId: string;
      title: string;
      dueDate?: string;
      body?: string;
      linkedGoalId?: string | null;
    }) => getTaskOperations().createTask({ listId, title, dueDate, body, linkedGoalId }),
    onSuccess: () => {
      invalidateCachedTasks(queryClient);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, listId }: { taskId: string; listId?: string }) => {
      const operations = getTaskOperations();
      await operations.deleteTask(await resolveTaskForMutation(operations, taskId, listId));
    },
    onSuccess: () => {
      invalidateCachedTasks(queryClient);
    },
  });
}

export function useLinkTaskToGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, goalId }: { taskId: string; goalId: string | null }) => {
      const operations = getTaskOperations();
      const cachedTask = await resolveCachedTask(operations, taskId);
      if (goalId) {
        await operations.linkTaskToGoal({ taskId: cachedTask.ms_task_id, goalId });
      } else {
        await operations.unlinkTaskFromGoal({ taskId: cachedTask.ms_task_id });
      }
    },
    onSuccess: () => {
      invalidateCachedTasks(queryClient);
    },
  });
}

async function resolveCachedTask(operations: TaskOperations, taskId: string): Promise<CachedTask> {
  const normalizedRef = taskId.trim();
  const cachedTasks = await operations.listCachedTasks();
  const exactMatch = cachedTasks.find((task) => task.ms_task_id === normalizedRef);
  const matchingTask =
    exactMatch ??
    cachedTasks.find(
      (task) => task.ms_task_id.startsWith(normalizedRef) || task.title.trim().toLowerCase() === normalizedRef.toLowerCase(),
    );

  if (!matchingTask) {
    throw new Error(`Task ${taskId} was not found in the local cache`);
  }

  return matchingTask;
}
