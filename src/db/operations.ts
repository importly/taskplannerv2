import { getDb } from "./index";
import { useTimerStore } from "../stores/timerStore";
import { useSessionStore } from "../stores/sessionStore";

/**
 * Persists a completed focus session to the database.
 * Follows the atomic write sequence defined in the Fluid Focus Engine spec.
 */
export async function saveFocusSession() {
  const db = getDb();
  const timer = useTimerStore.getState();
  const session = useSessionStore.getState();

  // If start time is missing, we use current time as fallback, 
  // though start should always be set for an ACTIVE -> STOPPED transition.
  const sessionStartTime = timer.startTime || Date.now();
  const startTimeStr = new Date(sessionStartTime).toISOString();
  const endTimeStr = new Date().toISOString();
  const sessionId = crypto.randomUUID();

  await db.transaction().execute(async (trx) => {
    // 1. Insert into focus_sessions
    await trx
      .insertInto("focus_sessions")
      .values({
        id: sessionId,
        start_time: startTimeStr,
        end_time: endTimeStr,
        focus_duration_seconds: Math.floor(timer.focusElapsedSeconds),
        break_duration_seconds: Math.floor(timer.breakElapsedSeconds),
        penalized: timer.penalized ? 1 : 0,
        linked_goal_id: session.linkedGoalId,
      })
      .execute();

    // 2. Insert into session_tags
    if (session.selectedTagIds.length > 0) {
      await trx
        .insertInto("session_tags")
        .values(
          session.selectedTagIds.map((tagId) => ({
            session_id: sessionId,
            tag_id: tagId,
          }))
        )
        .execute();
    }

    // 3. Insert into narrative_logs (if goal linked + journal content)
    if (session.linkedGoalId && session.journalContent.trim()) {
      await trx
        .insertInto("narrative_logs")
        .values({
          id: crypto.randomUUID(),
          goal_id: session.linkedGoalId,
          session_id: sessionId,
          content: session.journalContent.trim(),
        })
        .execute();
    }

    // 4. Calculate and insert into xp_ledger (if not penalized)
    if (!timer.penalized && session.selectedTagIds.length > 0) {
      const focusMinutes = Math.floor(timer.focusElapsedSeconds / 60);
      const totalXp = focusMinutes * 10;

      if (totalXp > 0) {
        // Fetch rpg_attributes for the selected tags to distribute XP
        const tags = await trx
          .selectFrom("tags")
          .select(["id", "rpg_attribute"])
          .where("id", "in", session.selectedTagIds)
          .execute();

        if (tags.length > 0) {
          const xpPerTag = Math.floor(totalXp / tags.length);
          const remainder = totalXp - xpPerTag * tags.length;

          for (let i = 0; i < tags.length; i++) {
            const xpAwarded = xpPerTag + (i === 0 ? remainder : 0);
            if (xpAwarded > 0) {
              await trx
                .insertInto("xp_ledger")
                .values({
                  id: crypto.randomUUID(),
                  session_id: sessionId,
                  rpg_attribute: tags[i].rpg_attribute,
                  xp_awarded: xpAwarded,
                  reason: "Focus Session",
                })
                .execute();
            }
          }
        }
      }
    }
  });
}

/**
 * Creates a new goal.
 */
export async function createGoal(title: string, description: string | null) {
  const db = getDb();
  return await db
    .insertInto("goals")
    .values({
      id: crypto.randomUUID(),
      title,
      description,
      progress_percent: 0,
    })
    .executeTakeFirst();
}

/**
 * Updates an existing goal's title and description.
 */
export async function updateGoal(id: string, title: string, description: string | null) {
  const db = getDb();
  return await db
    .updateTable("goals")
    .set({ title, description })
    .where("id", "=", id)
    .executeTakeFirst();
}

/**
 * Archives a goal by setting its archived_at timestamp.
 */
export async function archiveGoal(id: string) {
  const db = getDb();
  return await db
    .updateTable("goals")
    .set({ archived_at: new Date().toISOString() })
    .where("id", "=", id)
    .executeTakeFirst();
}

/**
 * Deletes a goal. Narrative logs and other relations are handled by ON DELETE CASCADE.
 */
export async function deleteGoal(id: string) {
  const db = getDb();
  return await db
    .deleteFrom("goals")
    .where("id", "=", id)
    .executeTakeFirst();
}

/**
 * Updates the progress percentage of a goal.
 */
export async function updateGoalProgress(id: string, progressPercent: number) {
  const db = getDb();
  return await db
    .updateTable("goals")
    .set({ progress_percent: progressPercent })
    .where("id", "=", id)
    .executeTakeFirst();
}

/**
 * Adds a manual narrative log entry to a goal.
 */
export async function addManualNarrativeLog(goalId: string, content: string) {
  const db = getDb();
  return await db
    .insertInto("narrative_logs")
    .values({
      id: crypto.randomUUID(),
      goal_id: goalId,
      content: content.trim(),
      session_id: null,
    })
    .executeTakeFirst();
}
