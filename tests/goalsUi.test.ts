import { describe, expect, test } from "bun:test";

describe("goals UI", () => {
  test("opens archived goals and exposes goal editing", async () => {
    const dashboardSource = await Bun.file("src/pages/GoalsDashboard.tsx").text();
    const detailSource = await Bun.file("src/pages/GoalDetail.tsx").text();

    expect(dashboardSource).toContain("onClick={() => setSelectedGoalId(goal.id)}");
    expect(dashboardSource).not.toContain("onClick={() => {}}");

    expect(detailSource).toContain("useUpdateGoal");
    expect(detailSource).toContain("setIsEditingGoal(true)");
    expect(detailSource).toContain("handleSaveGoalEdit");
    expect(detailSource).toContain("Edit Goal");
  });
});
