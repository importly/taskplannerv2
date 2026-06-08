import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS projects (
    id                         TEXT PRIMARY KEY,
    name                       TEXT NOT NULL,
    area                       TEXT NOT NULL CHECK (area IN ('lab', 'career', 'fundamentals', 'personal')),
    status                     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'blocked', 'done')),
    current_milestone          TEXT,
    next_action                TEXT,
    target_review_cadence_days INTEGER NOT NULL DEFAULT 7,
    evidence_url               TEXT,
    created_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS daily_plans (
    id                 TEXT PRIMARY KEY,
    plan_date          TEXT NOT NULL UNIQUE,
    primary_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    primary_action     TEXT,
    success_evidence   TEXT,
    secondary_items    TEXT,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS goal_metrics (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    unit              TEXT NOT NULL CHECK (unit IN ('problems', 'minutes', 'commits', 'applications', 'pages', 'sessions')),
    cadence           TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly')),
    target            REAL NOT NULL,
    linked_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    archived_at       TIMESTAMP,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS goal_metric_logs (
    id        TEXT PRIMARY KEY,
    metric_id TEXT NOT NULL REFERENCES goal_metrics(id) ON DELETE CASCADE,
    amount    REAL NOT NULL,
    note      TEXT,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`.execute(db);

  await sql`CREATE TABLE IF NOT EXISTS weekly_reviews (
    id                  TEXT PRIMARY KEY,
    week_start          TEXT NOT NULL,
    week_end            TEXT NOT NULL,
    biggest_blocker     TEXT,
    next_week_top_three TEXT,
    markdown_snapshot   TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(week_start)
  )`.execute(db);

  await addColumnIfMissing(db, "focus_sessions", "linked_project_id", () =>
    sql`ALTER TABLE focus_sessions ADD COLUMN linked_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL`.execute(db),
  );
  await addColumnIfMissing(db, "focus_sessions", "evidence_type", () =>
    sql`ALTER TABLE focus_sessions ADD COLUMN evidence_type TEXT CHECK (evidence_type IN ('commit', 'note', 'solved_problem', 'experiment_result', 'email_sent', 'application_submitted', 'no_artifact'))`.execute(db),
  );
  await addColumnIfMissing(db, "focus_sessions", "evidence_url", () =>
    sql`ALTER TABLE focus_sessions ADD COLUMN evidence_url TEXT`.execute(db),
  );
  await addColumnIfMissing(db, "focus_sessions", "evidence_note", () =>
    sql`ALTER TABLE focus_sessions ADD COLUMN evidence_note TEXT`.execute(db),
  );

  await sql`CREATE INDEX IF NOT EXISTS idx_focus_sessions_project ON focus_sessions(linked_project_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_focus_sessions_start_time ON focus_sessions(start_time)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_goal_metric_logs_metric_time ON goal_metric_logs(metric_id, logged_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(plan_date)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS weekly_reviews`.execute(db);
  await sql`DROP TABLE IF EXISTS goal_metric_logs`.execute(db);
  await sql`DROP TABLE IF EXISTS goal_metrics`.execute(db);
  await sql`DROP TABLE IF EXISTS daily_plans`.execute(db);
  await sql`DROP TABLE IF EXISTS projects`.execute(db);
  // SQLite column drops are intentionally omitted for focus_sessions.
}

async function addColumnIfMissing(
  db: Kysely<unknown>,
  _tableName: "focus_sessions",
  columnName: string,
  alter: () => Promise<unknown>,
): Promise<void> {
  const result = await sql<{ name: string }>`PRAGMA table_info(focus_sessions)`.execute(db);
  const hasColumn = result.rows.some((row) => row.name === columnName);
  if (!hasColumn) await alter();
}
