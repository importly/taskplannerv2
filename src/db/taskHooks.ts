import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDb } from "./index";
import { syncAllTasks } from "../services/syncEngine";
import { completeTask, updateTask, createTask } from "../services/msGraphService";
import type { TodoTask } from "microsoft-graph";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  cached: () => [...taskKeys.all, "cached"] as const,
};

export function useCachedTasks() {
  return useQuery({
    queryKey: taskKeys.cached(),
    queryFn: async () => {
      const db = getDb();
      return await db
        .selectFrom("cached_tasks")
        .selectAll()
        .orderBy("due_date", "asc")
        .execute();
    },
  });
}

export function useSyncTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncAllTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.cached() });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, listId }: { taskId: string; listId: string }) => {
      await completeTask(listId, taskId);
      const db = getDb();
      await db
        .deleteFrom("cached_tasks")
        .where("ms_task_id", "=", taskId)
        .execute();
    },
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.cached() });
      const previousTasks = queryClient.getQueryData(taskKeys.cached());

      queryClient.setQueryData(taskKeys.cached(), (old: any[] | undefined) => {
        return old?.filter((t) => t.ms_task_id !== taskId);
      });

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.cached(), context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.cached() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      listId, 
      fields 
    }: { 
      taskId: string; 
      listId: string; 
      fields: Partial<TodoTask> 
    }) => {
      await updateTask(listId, taskId, fields);
      
      const db = getDb();
      const updateData: any = {};
      if (fields.title) updateData.title = fields.title;
      if (fields.dueDateTime) updateData.due_date = fields.dueDateTime.dateTime;
      if (fields.status) updateData.status = fields.status;
      
      if (Object.keys(updateData).length > 0) {
        await db
          .updateTable("cached_tasks")
          .set(updateData)
          .where("ms_task_id", "=", taskId)
          .execute();
      }
    },
    onMutate: async ({ taskId, fields }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.cached() });
      const previousTasks = queryClient.getQueryData(taskKeys.cached());

      queryClient.setQueryData(taskKeys.cached(), (old: any[] | undefined) => {
        return old?.map((t) => {
          if (t.ms_task_id === taskId) {
            return {
              ...t,
              title: fields.title ?? t.title,
              due_date: fields.dueDateTime?.dateTime ?? t.due_date,
              status: fields.status ?? t.status,
            };
          }
          return t;
        });
      });

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.cached(), context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.cached() });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, title }: { listId: string; title: string }) => {
      const newTask = await createTask(listId, title);
      
      const db = getDb();
      await db
        .insertInto("cached_tasks")
        .values({
          ms_task_id: newTask.id!,
          title: newTask.title!,
          body: newTask.body?.content || null,
          status: newTask.status || "notStarted",
          due_date: newTask.dueDateTime?.dateTime || null,
          list_id: listId,
          linked_goal_id: null,
        })
        .execute();
        
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.cached() });
    },
  });
}

export function useLinkTaskToGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, goalId }: { taskId: string; goalId: string | null }) => {
      const db = getDb();
      await db
        .updateTable("cached_tasks")
        .set({ linked_goal_id: goalId })
        .where("ms_task_id", "=", taskId)
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.cached() });
    },
  });
}
