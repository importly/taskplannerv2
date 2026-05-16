import { sql, type Kysely } from "kysely";

// Attribute taxonomy overhaul: Logic→ML/Math, Knowledge→Research, Craft→Engineering.
// Rewrites tags.rpg_attribute and xp_ledger.rpg_attribute in place.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`UPDATE tags SET rpg_attribute = 'ML/Math'     WHERE rpg_attribute = 'Logic'`.execute(db);
  await sql`UPDATE tags SET rpg_attribute = 'Research'    WHERE rpg_attribute = 'Knowledge'`.execute(db);
  await sql`UPDATE tags SET rpg_attribute = 'Engineering' WHERE rpg_attribute = 'Craft'`.execute(db);

  await sql`UPDATE xp_ledger SET rpg_attribute = 'ML/Math'     WHERE rpg_attribute = 'Logic'`.execute(db);
  await sql`UPDATE xp_ledger SET rpg_attribute = 'Research'    WHERE rpg_attribute = 'Knowledge'`.execute(db);
  await sql`UPDATE xp_ledger SET rpg_attribute = 'Engineering' WHERE rpg_attribute = 'Craft'`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`UPDATE tags SET rpg_attribute = 'Logic'     WHERE rpg_attribute = 'ML/Math'`.execute(db);
  await sql`UPDATE tags SET rpg_attribute = 'Knowledge' WHERE rpg_attribute = 'Research'`.execute(db);
  await sql`UPDATE tags SET rpg_attribute = 'Craft'     WHERE rpg_attribute = 'Engineering'`.execute(db);

  await sql`UPDATE xp_ledger SET rpg_attribute = 'Logic'     WHERE rpg_attribute = 'ML/Math'`.execute(db);
  await sql`UPDATE xp_ledger SET rpg_attribute = 'Knowledge' WHERE rpg_attribute = 'Research'`.execute(db);
  await sql`UPDATE xp_ledger SET rpg_attribute = 'Craft'     WHERE rpg_attribute = 'Engineering'`.execute(db);
}
