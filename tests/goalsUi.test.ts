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

  test("starting focus from goal detail routes back to the timer", async () => {
    const appSource = await Bun.file("src/App.tsx").text();
    const dashboardSource = await Bun.file("src/pages/GoalsDashboard.tsx").text();
    const detailSource = await Bun.file("src/pages/GoalDetail.tsx").text();

    expect(appSource).toContain('<GoalsDashboard onStartFocus={() => setPage("command-center")} />');
    expect(dashboardSource).toContain("onStartFocus: () => void");
    expect(dashboardSource).toContain("onStartFocus={onStartFocus}");
    expect(detailSource).toContain("onStartFocus: () => void");
    expect(detailSource).toContain("onStartFocus();");
  });
});
