import type { Generated } from "kysely";

export interface UserSettingsTable {
  key: string;
  value: string;
}

export interface GoalsTable {
  id: string;
  title: string;
  description: string | null;
  progress_percent: Generated<number>;
  created_at: Generated<string>;
  archived_at: string | null;
}

export interface CachedTasksTable {
  ms_task_id: string;
  title: string;
  body: string | null;
  status: string | null;
  due_date: string | null;
  list_id: string | null;
  linked_goal_id: string | null;
}

export interface FocusSessionsTable {
  id: string;
  start_time: string;
  end_time: string;
  focus_duration_seconds: number;
  break_duration_seconds: Generated<number>;
  penalized: Generated<number>;
  linked_goal_id: string | null;
}

export interface NarrativeLogsTable {
  id: string;
  goal_id: string;
  session_id: string | null;
  content: string;
  timestamp: Generated<string>;
}

export interface TagsTable {
  id: string;       // UUID for new tags; legacy slug for backfilled rows
  name: string;     // display name
  rpg_attribute: string;
  color_hex: string | null;
}

export interface SessionTagsTable {
  session_id: string;
  tag_id: string;
}

export interface XpLedgerTable {
  id: string;
  session_id: string | null;
  rpg_attribute: string;
  xp_awarded: number;
  reason: string | null;
  timestamp: Generated<string>;
}

export interface DatabaseSchema {
  user_settings: UserSettingsTable;
  goals: GoalsTable;
  cached_tasks: CachedTasksTable;
  focus_sessions: FocusSessionsTable;
  narrative_logs: NarrativeLogsTable;
  tags: TagsTable;
  session_tags: SessionTagsTable;
  xp_ledger: XpLedgerTable;
}
