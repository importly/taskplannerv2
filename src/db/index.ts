import { Kysely, Migrator } from "kysely";
import { TauriSqliteDialect } from "./adapter";
import type { DatabaseSchema } from "./types";
import * as migration001 from "./migrations/001_initial_schema";
import * as migration002 from "./migrations/002_seed_default_tags";
import * as migration003 from "./migrations/003_goals_archive";

let _db: Kysely<DatabaseSchema> | null = null;

export async function initDb(): Promise<Kysely<DatabaseSchema>> {
  if (_db) return _db;

  _db = new Kysely<DatabaseSchema>({
    dialect: new TauriSqliteDialect("sqlite:.env"),
  });

  const migrator = new Migrator({
    db: _db,
    provider: {
      getMigrations: async () => ({
        "001_initial_schema": migration001,
        "002_seed_default_tags": migration002,
        "003_goals_archive": migration003,
      }),
    },
  });

  const { error } = await migrator.migrateToLatest();
  if (error) throw error;

  return _db;
}

export function getDb(): Kysely<DatabaseSchema> {
  if (!_db) throw new Error("DB not initialized. Call initDb() first.");
  return _db;
}

export type { DatabaseSchema };
