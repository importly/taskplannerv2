import { getDb } from "../db";
import { fetchTodoLists, fetchTasksForList, deleteTask } from "./msGraphService";

export async function syncAllTasks() {
  const db = getDb();
  const lists = await fetchTodoLists();

  const allFetchedTaskIds: string[] = [];
  const tasksToUpsert: any[] = [];

  // Track duplicates discovered server-side: same (list_id, title, normalized due_date).
  // This happens when a recurring task is completed then un-completed — Graph spawns the
  // next occurrence and we end up with two open tasks with identical title + due_date.
  // We keep the lexicographically-smallest ms_task_id (deterministic across syncs) and
  // delete the rest from Graph AND from local cache.
  const dedupeBuckets = new Map<string, string[]>();
  const taskListMap = new Map<string, string>(); // ms_task_id -> list_id

  for (const list of lists) {
    if (!list.id) continue;
    const tasks = await fetchTasksForList(list.id);

    for (const task of tasks) {
      if (!task.id) continue;
      allFetchedTaskIds.push(task.id);
      taskListMap.set(task.id, list.id);

      const title = task.title || "Untitled";
      const due = task.dueDateTime?.dateTime || null;
      // Bucket by day, not exact timestamp, since Graph may differ on tz/ms.
      const dueKey = due ? new Date(due).toISOString().slice(0, 10) : "";
      const bucketKey = `${list.id}|${title.trim().toLowerCase()}|${dueKey}`;
      if (!dedupeBuckets.has(bucketKey)) dedupeBuckets.set(bucketKey, []);
      dedupeBuckets.get(bucketKey)!.push(task.id);

      tasksToUpsert.push({
        ms_task_id: task.id,
        title,
        body: task.body?.content || null,
        status: task.status || null,
        due_date: due,
        list_id: list.id,
        linked_goal_id: null,
      });
    }
  }

  // Resolve duplicates: keep the smallest id, drop the rest from upsert + remote.
  const idsToDelete = new Set<string>();
  for (const ids of dedupeBuckets.values()) {
    if (ids.length <= 1) continue;
    ids.sort();
    // Keep ids[0], delete the rest.
    for (let j = 1; j < ids.length; j++) idsToDelete.add(ids[j]);
  }

  if (idsToDelete.size > 0) {
    // Best-effort delete from Graph. Failures are swallowed so local cleanup still happens.
    await Promise.all(
      Array.from(idsToDelete).map(async (id) => {
        const lid = taskListMap.get(id);
        if (!lid) return;
        try {
          await deleteTask(lid, id);
        } catch (err) {
          console.warn("[syncEngine] failed to delete duplicate task on Graph", id, err);
        }
      })
    );

    // Strip duplicates from the upsert payload and from the "keep" set so we delete
    // them locally below as well.
    for (let i = tasksToUpsert.length - 1; i >= 0; i--) {
      if (idsToDelete.has(tasksToUpsert[i].ms_task_id)) {
        tasksToUpsert.splice(i, 1);
      }
    }
    for (let i = allFetchedTaskIds.length - 1; i >= 0; i--) {
      if (idsToDelete.has(allFetchedTaskIds[i])) {
        allFetchedTaskIds.splice(i, 1);
      }
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
