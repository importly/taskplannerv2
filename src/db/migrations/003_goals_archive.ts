import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE goals ADD COLUMN archived_at TIMESTAMP DEFAULT NULL`.execute(db);
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite doesn't support DROP COLUMN easily before 3.35.0, 
  // and even then it's better to just leave it if possible or recreate table.
  // For simplicity and safety in migrations, we usually don't drop columns in SQLite down migrations unless critical.
  // However, Kysely might handle it if the dialect supports it.
  // Given the environment, I'll stick to a simple up migration.
}
