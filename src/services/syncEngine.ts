import { getDb } from "../db";
import { fetchTodoLists, fetchTasksForList } from "./msGraphService";

export async function syncAllTasks() {
  const db = getDb();
  const lists = await fetchTodoLists();
  
  const allFetchedTaskIds: string[] = [];

  for (const list of lists) {
    if (!list.id) continue;
    const tasks = await fetchTasksForList(list.id);
    
    for (const task of tasks) {
      if (!task.id) continue;
      allFetchedTaskIds.push(task.id);

      await db
        .insertInto("cached_tasks")
        .values({
          ms_task_id: task.id,
          title: task.title || "Untitled",
          body: task.body?.content || null,
          status: task.status || null,
          due_date: task.dueDateTime?.dateTime || null,
          list_id: list.id,
          linked_goal_id: null,
        })
        .onConflict((oc) => oc
          .column("ms_task_id")
          .doUpdateSet({
            title: task.title || "Untitled",
            body: task.body?.content || null,
            status: task.status || null,
            due_date: task.dueDateTime?.dateTime || null,
            list_id: list.id,
          })
        )
        .execute();
    }
  }

  // Delete tasks from SQLite that are now completed or missing from the fetch.
  if (allFetchedTaskIds.length > 0) {
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
