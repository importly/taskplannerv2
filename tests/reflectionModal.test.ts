import { describe, expect, test } from "bun:test";

describe("reflection modal cleanup", () => {
  test("does not expose removed project or evidence review fields", async () => {
    const modalSource = await Bun.file("src/components/timer/ReflectionModal.tsx").text();
    const sessionStoreSource = await Bun.file("src/stores/sessionStore.ts").text();
    const operationsSource = await Bun.file("src/db/operations.ts").text();

    for (const removedTerm of [
      "Linked Project",
      "Evidence Produced",
      "No project linked",
      "No artifact",
      "useProjects",
      "projectKeys",
      "reviewKeys",
      "weeklyReview",
      "linkedProjectId",
      "evidenceType",
      "evidenceUrl",
      "evidenceNote",
      "setProject",
      "setEvidenceType",
      "setEvidenceUrl",
      "setEvidenceNote",
    ]) {
      expect(modalSource, removedTerm).not.toContain(removedTerm);
      expect(sessionStoreSource, removedTerm).not.toContain(removedTerm);
    }

    for (const removedColumn of [
      "linked_project_id",
      "evidence_type",
      "evidence_url",
      "evidence_note",
    ]) {
      expect(operationsSource, removedColumn).not.toContain(removedColumn);
    }
  });
});
