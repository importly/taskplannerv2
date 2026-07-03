import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS user_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS goals (
    id               TEXT PRIMARY KEY,
    title            TEXT NOT NULL,
    description      TEXT,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS cached_tasks (
    ms_task_id     TEXT PRIMARY KEY,
    title          TEXT NOT NULL,
    body           TEXT,
    status         TEXT,
    due_date       TIMESTAMP,
    list_id        TEXT,
    linked_goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS focus_sessions (
    id                     TEXT PRIMARY KEY,
    start_time             TIMESTAMP NOT NULL,
    end_time               TIMESTAMP NOT NULL,
    focus_duration_seconds INTEGER NOT NULL,
    break_duration_seconds INTEGER NOT NULL DEFAULT 0,
    linked_goal_id         TEXT REFERENCES goals(id) ON DELETE SET NULL
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS narrative_logs (
    id         TEXT PRIMARY KEY,
    goal_id    TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES focus_sessions(id) ON DELETE SET NULL,
    content    TEXT NOT NULL,
    timestamp  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS tags (
    id            TEXT PRIMARY KEY,
    rpg_attribute TEXT NOT NULL,
    color_hex     TEXT
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS session_tags (
    session_id TEXT NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
    tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, tag_id)
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS xp_ledger (
    id            TEXT PRIMARY KEY,
    session_id    TEXT REFERENCES focus_sessions(id) ON DELETE SET NULL,
    rpg_attribute TEXT NOT NULL,
    xp_awarded    INTEGER NOT NULL,
    reason        TEXT,
    timestamp     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS xp_ledger`.execute(db);
  await sql`DROP TABLE IF EXISTS session_tags`.execute(db);
  await sql`DROP TABLE IF EXISTS tags`.execute(db);
  await sql`DROP TABLE IF EXISTS narrative_logs`.execute(db);
  await sql`DROP TABLE IF EXISTS focus_sessions`.execute(db);
  await sql`DROP TABLE IF EXISTS cached_tasks`.execute(db);
  await sql`DROP TABLE IF EXISTS goals`.execute(db);
  await sql`DROP TABLE IF EXISTS user_settings`.execute(db);
}
