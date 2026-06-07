import type { Generated } from "kysely";
import type {
  EvidenceType,
  GoalMetricCadence,
  GoalMetricUnit,
  ProjectArea,
  ProjectStatus,
} from "../lib/weeklyReview";

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
  linked_project_id: Generated<string | null>;
  evidence_type: Generated<EvidenceType | null>;
  evidence_url: Generated<string | null>;
  evidence_note: Generated<string | null>;
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

export interface ProjectsTable {
  id: string;
  name: string;
  area: ProjectArea;
  status: ProjectStatus;
  current_milestone: string | null;
  next_action: string | null;
  target_review_cadence_days: Generated<number>;
  evidence_url: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface DailyPlansTable {
  id: string;
  plan_date: string;
  primary_project_id: string | null;
  primary_action: string | null;
  success_evidence: string | null;
  secondary_items: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface GoalMetricsTable {
  id: string;
  name: string;
  unit: GoalMetricUnit;
  cadence: GoalMetricCadence;
  target: number;
  linked_project_id: string | null;
  archived_at: string | null;
  created_at: Generated<string>;
}

export interface GoalMetricLogsTable {
  id: string;
  metric_id: string;
  amount: number;
  note: string | null;
  logged_at: Generated<string>;
}

export interface WeeklyReviewsTable {
  id: string;
  week_start: string;
  week_end: string;
  biggest_blocker: string | null;
  next_week_top_three: string | null;
  markdown_snapshot: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
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
  projects: ProjectsTable;
  daily_plans: DailyPlansTable;
  goal_metrics: GoalMetricsTable;
  goal_metric_logs: GoalMetricLogsTable;
  weekly_reviews: WeeklyReviewsTable;
}
