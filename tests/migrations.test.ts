import { describe, expect, test } from "bun:test";

describe("SQLite migrations", () => {
  test("guard additive column migrations so partial local installs can recover", async () => {
    const initialSchema = await Bun.file("src/db/migrations/001_initial_schema.ts").text();
    const tagsMigration = await Bun.file("src/db/migrations/004_tags_add_name.ts").text();
    const scoreboardMigration = await Bun.file("src/db/migrations/006_weekly_scoreboard.ts").text();

    expect(initialSchema).not.toContain("penalized");
    expect(tagsMigration).toContain("PRAGMA table_info(tags)");
    expect(tagsMigration).toContain('addColumnIfMissing(db, "tags", "name"');
    expect(tagsMigration.match(/await sql`ALTER TABLE tags ADD COLUMN/g) ?? []).toHaveLength(0);

    expect(scoreboardMigration).toContain("PRAGMA table_info(focus_sessions)");
    for (const column of ["linked_project_id", "evidence_type", "evidence_url", "evidence_note"]) {
      expect(scoreboardMigration).toContain(`addColumnIfMissing(db, "focus_sessions", "${column}"`);
    }
    expect(scoreboardMigration.match(/await sql`ALTER TABLE focus_sessions ADD COLUMN/g) ?? []).toHaveLength(0);
  });
});
