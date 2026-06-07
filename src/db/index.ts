import { Kysely, Migrator } from "kysely";
import { TauriSqliteDialect } from "./adapter";
import type { DatabaseSchema } from "./types";
import * as migration001 from "./migrations/001_initial_schema";
import * as migration002 from "./migrations/002_seed_default_tags";
import * as migration003 from "./migrations/003_goals_archive";
import * as migration004 from "./migrations/004_tags_add_name";
import * as migration005 from "./migrations/005_remap_attributes";
import * as migration006 from "./migrations/006_weekly_scoreboard";

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
        "004_tags_add_name": migration004,
        "005_remap_attributes": migration005,
        "006_weekly_scoreboard": migration006,
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
