export type ProjectArea = "lab" | "career" | "fundamentals" | "personal";
export type ProjectStatus = "active" | "paused" | "blocked" | "done";
export type EvidenceType =
  | "commit"
  | "note"
  | "solved_problem"
  | "experiment_result"
  | "email_sent"
  | "application_submitted"
  | "no_artifact";
export type GoalMetricUnit = "problems" | "minutes" | "commits" | "applications" | "pages" | "sessions";
export type GoalMetricCadence = "daily" | "weekly";

export interface ReviewProject {
  id: string;
  name: string;
  area: ProjectArea;
  status: ProjectStatus;
  current_milestone: string | null;
  next_action: string | null;
  target_review_cadence_days: number;
  evidence_url: string | null;
}

export interface ReviewSession {
  linked_project_id: string | null;
  start_time: string;
  evidence_type: EvidenceType | string | null;
  evidence_url?: string | null;
  evidence_note?: string | null;
}

export interface ReviewMetric {
  id: string;
  name: string;
  unit: GoalMetricUnit;
  cadence: GoalMetricCadence;
  target: number;
}

export interface ReviewMetricLog {
  metric_id: string;
  amount: number;
  logged_at: string;
}

export interface WeekBounds {
  weekStartKey: string;
  weekEndKey: string;
  weekStartIso: string;
  weekEndIso: string;
}

export interface MetricPeriodCount {
  id: string;
  name: string;
  unit: GoalMetricUnit;
  cadence: GoalMetricCadence;
  target: number;
  current: number;
  hit: boolean;
}

export interface ProjectHealthRow {
  id: string;
  name: string;
  area: ProjectArea;
  status: ProjectStatus;
  current_milestone: string | null;
  next_action: string | null;
  target_review_cadence_days: number;
  evidence_url: string | null;
  last_touched_at: string | null;
  flags: Array<"stale" | "blocked" | "no_next_action" | "no_evidence">;
}

export interface ProjectHealthSummary {
  projects: ProjectHealthRow[];
  globalFlags: Array<"overloaded">;
}

export interface WeeklyReviewMarkdownInput {
  weekStartKey: string;
  weekEndKey: string;
  focusSessionCount: number;
  focusMinutes: number;
  projectsTouched: string[];
  projectsNeglected: string[];
  metrics: Array<{
    name: string;
    current: number;
    target: number;
    unit: GoalMetricUnit;
    hit: boolean;
  }>;
  evidence: Array<{
    projectName: string;
    evidenceType: EvidenceType | string;
    evidenceUrl?: string | null;
    evidenceNote?: string | null;
  }>;
  biggestBlocker: string;
  nextWeekTopThree: string[];
}

export function getWeekBounds(date = new Date()): WeekBounds {
  const dayStart = startOfUtcDay(date);
  const day = dayStart.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const weekStart = addUtcDays(dayStart, -daysSinceMonday);
  const weekEnd = new Date(weekStart.getTime() + 6 * MS_PER_DAY + MS_PER_DAY - 1);

  return {
    weekStartKey: toDateKey(weekStart),
    weekEndKey: toDateKey(weekEnd),
    weekStartIso: weekStart.toISOString(),
    weekEndIso: weekEnd.toISOString(),
  };
}

export function toDateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function computeMetricPeriodCounts(
  metrics: ReviewMetric[],
  logs: ReviewMetricLog[],
  now = new Date()
): MetricPeriodCount[] {
  const bounds = getWeekBounds(now);
  const todayKey = toDateKey(now);

  return metrics.map((metric) => {
    const current = logs
      .filter((log) => log.metric_id === metric.id)
      .filter((log) => {
        const loggedAt = new Date(log.logged_at);
        if (Number.isNaN(loggedAt.getTime())) return false;
        if (metric.cadence === "daily") return toDateKey(loggedAt) === todayKey;
        return log.logged_at >= bounds.weekStartIso && log.logged_at <= bounds.weekEndIso;
      })
      .reduce((sum, log) => sum + log.amount, 0);

    return {
      ...metric,
      current,
      hit: current >= metric.target,
    };
  });
}

export function computeProjectHealth(
  projects: ReviewProject[],
  sessions: ReviewSession[],
  now = new Date()
): ProjectHealthSummary {
  const activeProjects = projects.filter((project) => project.status === "active");
  const sessionsByProject = new Map<string, ReviewSession[]>();

  for (const session of sessions) {
    if (!session.linked_project_id) continue;
    const existing = sessionsByProject.get(session.linked_project_id) ?? [];
    existing.push(session);
    sessionsByProject.set(session.linked_project_id, existing);
  }

  const rows = projects.map<ProjectHealthRow>((project) => {
    const projectSessions = sessionsByProject.get(project.id) ?? [];
    const lastTouchedAt = latestIso(projectSessions.map((session) => session.start_time));
    const flags: ProjectHealthRow["flags"] = [];
    const cadenceDays = Math.max(1, project.target_review_cadence_days || 7);

    if (project.status === "blocked") flags.push("blocked");
    if ((project.status === "active" || project.status === "blocked") && !project.next_action?.trim()) {
      flags.push("no_next_action");
    }
    if (project.status === "active" && isStale(lastTouchedAt, now, cadenceDays)) {
      flags.push("stale");
    }
    if (projectSessions.length > 0 && !projectSessions.some(sessionHasEvidence)) {
      flags.push("no_evidence");
    }

    return {
      ...project,
      last_touched_at: lastTouchedAt,
      flags,
    };
  });

  return {
    projects: rows,
    globalFlags: activeProjects.length > 4 ? ["overloaded"] : [],
  };
}

export function buildWeeklyReviewMarkdown(input: WeeklyReviewMarkdownInput): string {
  const lines = [
    `# Weekly Review - ${input.weekStartKey} to ${input.weekEndKey}`,
    "",
    "## Focus",
    `- Sessions completed: ${input.focusSessionCount}`,
    `- Focus minutes: ${Math.round(input.focusMinutes)}`,
    "",
    "## Shipped Evidence",
    ...listOrPlaceholder(
      input.evidence.map((item) => {
        const detail = item.evidenceUrl || item.evidenceNote || "recorded";
        return `${item.projectName}: ${formatEvidenceType(item.evidenceType)} - ${detail}`;
      })
    ),
    "",
    "## Project Health",
    "- Touched: " + (input.projectsTouched.length > 0 ? input.projectsTouched.join(", ") : "None"),
    "- Neglected: " + (input.projectsNeglected.length > 0 ? input.projectsNeglected.join(", ") : "None"),
    "",
    "## Goal Metrics",
    ...listOrPlaceholder(
      input.metrics.map((metric) => (
        `${metric.name}: ${metric.current}/${metric.target} ${metric.unit} (${metric.hit ? "hit" : "missed"})`
      ))
    ),
    "",
    "## Biggest Blocker",
    input.biggestBlocker.trim() || "None recorded",
    "",
    "## Next Week",
    ...numberedOrPlaceholder(input.nextWeekTopThree),
  ];

  return `${lines.join("\n")}\n`;
}

export function formatEvidenceType(type: EvidenceType | string): string {
  return type.replace(/_/g, " ");
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function latestIso(values: string[]): string | null {
  let latest: Date | null = null;

  for (const value of values) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    if (!latest || date > latest) latest = date;
  }

  return latest?.toISOString() ?? null;
}

function isStale(lastTouchedAt: string | null, now: Date, cadenceDays: number): boolean {
  if (!lastTouchedAt) return true;
  const lastTouched = new Date(lastTouchedAt);
  if (Number.isNaN(lastTouched.getTime())) return true;
  return now.getTime() - lastTouched.getTime() > cadenceDays * MS_PER_DAY;
}

function sessionHasEvidence(session: ReviewSession): boolean {
  return Boolean(session.evidence_type && session.evidence_type !== "no_artifact");
}

function listOrPlaceholder(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- None"];
}

function numberedOrPlaceholder(items: string[]): string[] {
  return items.length > 0 ? items.map((item, index) => `${index + 1}. ${item}`) : ["1. None recorded"];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
