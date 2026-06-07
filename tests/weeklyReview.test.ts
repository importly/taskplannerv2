import { describe, expect, test } from "bun:test";
import {
  buildWeeklyReviewMarkdown,
  computeMetricPeriodCounts,
  computeProjectHealth,
  getWeekBounds,
} from "../src/lib/weeklyReview";

describe("weekly review helpers", () => {
  test("uses Monday-start week boundaries", () => {
    const bounds = getWeekBounds(new Date("2026-05-23T12:00:00-04:00"));

    expect(bounds.weekStartKey).toBe("2026-05-18");
    expect(bounds.weekEndKey).toBe("2026-05-24");
    expect(bounds.weekStartIso).toBe("2026-05-18T00:00:00.000Z");
    expect(bounds.weekEndIso).toBe("2026-05-24T23:59:59.999Z");
  });

  test("computes metric totals for daily and weekly cadences", () => {
    const result = computeMetricPeriodCounts(
      [
        { id: "leetcode", name: "Neetcode", unit: "problems", cadence: "weekly", target: 10 },
        { id: "reading", name: "CUDA Reading", unit: "minutes", cadence: "daily", target: 30 },
      ],
      [
        { metric_id: "leetcode", amount: 2, logged_at: "2026-05-18T10:00:00.000Z" },
        { metric_id: "leetcode", amount: 3, logged_at: "2026-05-22T10:00:00.000Z" },
        { metric_id: "leetcode", amount: 99, logged_at: "2026-05-11T10:00:00.000Z" },
        { metric_id: "reading", amount: 20, logged_at: "2026-05-23T08:00:00.000Z" },
        { metric_id: "reading", amount: 15, logged_at: "2026-05-23T16:00:00.000Z" },
        { metric_id: "reading", amount: 90, logged_at: "2026-05-22T16:00:00.000Z" },
      ],
      new Date("2026-05-23T12:00:00.000Z")
    );

    expect(result).toEqual([
      expect.objectContaining({ id: "leetcode", current: 5, target: 10, hit: false }),
      expect.objectContaining({ id: "reading", current: 35, target: 30, hit: true }),
    ]);
  });

  test("computes stale, no-action, no-evidence, and overloaded project flags", () => {
    const result = computeProjectHealth(
      [
        project("lab", "Lab", "active", "Test bench", 7),
        project("career", "Career", "active", "", 7),
        project("fundamentals", "Fundamentals", "active", "Read chapter", 7),
        project("portfolio", "Portfolio", "active", "Ship page", 7),
        project("cuda", "CUDA", "active", "Run kernel", 7),
      ],
      [
        { linked_project_id: "lab", start_time: "2026-05-10T12:00:00.000Z", evidence_type: "commit" },
        { linked_project_id: "career", start_time: "2026-05-22T12:00:00.000Z", evidence_type: "no_artifact" },
      ],
      new Date("2026-05-23T12:00:00.000Z")
    );

    expect(result.globalFlags).toContain("overloaded");
    expect(result.projects.find((p) => p.id === "lab")?.flags).toContain("stale");
    expect(result.projects.find((p) => p.id === "career")?.flags).toEqual(
      expect.arrayContaining(["no_next_action", "no_evidence"])
    );
  });

  test("builds weekly review markdown with evidence and next week top three", () => {
    const markdown = buildWeeklyReviewMarkdown({
      weekStartKey: "2026-05-18",
      weekEndKey: "2026-05-24",
      focusSessionCount: 6,
      focusMinutes: 235,
      projectsTouched: ["DMD video mode", "Neetcode"],
      projectsNeglected: ["Portfolio site"],
      metrics: [
        { name: "Neetcode", current: 8, target: 10, unit: "problems", hit: false },
        { name: "Lab", current: 4, target: 4, unit: "sessions", hit: true },
      ],
      evidence: [
        { projectName: "DMD video mode", evidenceType: "commit", evidenceUrl: "https://example.test/commit" },
      ],
      biggestBlocker: "Unclear lab machine access",
      nextWeekTopThree: ["Finish dual-DMD test", "Solve 10 problems", "Publish portfolio case study"],
    });

    expect(markdown).toContain("# Weekly Review - 2026-05-18 to 2026-05-24");
    expect(markdown).toContain("- DMD video mode: commit - https://example.test/commit");
    expect(markdown).toContain("- Neetcode: 8/10 problems (missed)");
    expect(markdown).toContain("1. Finish dual-DMD test");
  });
});

function project(
  id: string,
  name: string,
  status: "active" | "paused" | "blocked" | "done",
  next_action: string,
  target_review_cadence_days: number
) {
  return {
    id,
    name,
    area: "lab" as const,
    status,
    current_milestone: null,
    next_action,
    target_review_cadence_days,
    evidence_url: null,
  };
}
