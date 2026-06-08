import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await addColumnIfMissing(db, "tags", "name", () =>
    sql`ALTER TABLE tags ADD COLUMN name TEXT NOT NULL DEFAULT ''`.execute(db),
  );
  await sql`UPDATE tags SET name = id WHERE name = ''`.execute(db);
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support DROP COLUMN — migration is not reversible
}

async function addColumnIfMissing(
  db: Kysely<unknown>,
  _tableName: "tags",
  columnName: string,
  alter: () => Promise<unknown>,
): Promise<void> {
  const result = await sql<{ name: string }>`PRAGMA table_info(tags)`.execute(db);
  const hasColumn = result.rows.some((row) => row.name === columnName);
  if (!hasColumn) await alter();
}
