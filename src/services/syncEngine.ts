import { getDb } from "../db";
import { fetchTodoLists, fetchTasksForList } from "./msGraphService";

export async function syncAllTasks() {
  const db = getDb();
  const lists = await fetchTodoLists();
  
  const allFetchedTaskIds: string[] = [];
  const tasksToUpsert: any[] = [];

  for (const list of lists) {
    if (!list.id) continue;
    const tasks = await fetchTasksForList(list.id);
    
    for (const task of tasks) {
      if (!task.id) continue;
      allFetchedTaskIds.push(task.id);
      
      tasksToUpsert.push({
        ms_task_id: task.id,
        title: task.title || "Untitled",
        body: task.body?.content || null,
        status: task.status || null,
        due_date: task.dueDateTime?.dateTime || null,
        list_id: list.id,
        linked_goal_id: null,
      });
    }
  }

  // Batch upsert tasks in chunks to avoid SQLite variable limits
  const CHUNK_SIZE = 50;
  for (let i = 0; i < tasksToUpsert.length; i += CHUNK_SIZE) {
    const chunk = tasksToUpsert.slice(i, i + CHUNK_SIZE);
    await db
      .insertInto("cached_tasks")
      .values(chunk)
      .onConflict((oc) => oc
        .column("ms_task_id")
        .doUpdateSet((eb) => ({
          title: eb.ref("excluded.title"),
          body: eb.ref("excluded.body"),
          status: eb.ref("excluded.status"),
          due_date: eb.ref("excluded.due_date"),
          list_id: eb.ref("excluded.list_id"),
        }))
      )
      .execute();
  }

  // Delete tasks from SQLite that are now completed or missing from the fetch.
  if (allFetchedTaskIds.length > 0) {
    // We can't easily chunk 'NOT IN' if we want to delete everything else.
    // For most users, task count < 999, so this is fine.
    // If it's more, we'd need a different strategy (like temporary tables).
    await db
      .deleteFrom("cached_tasks")
      .where("ms_task_id", "not in", allFetchedTaskIds)
      .execute();
  } else {
    await db
      .deleteFrom("cached_tasks")
      .execute();
  }
}
