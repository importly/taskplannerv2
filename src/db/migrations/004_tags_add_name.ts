import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE tags ADD COLUMN name TEXT NOT NULL DEFAULT ''`.execute(db);
  await sql`UPDATE tags SET name = id WHERE name = ''`.execute(db);
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support DROP COLUMN — migration is not reversible
}
