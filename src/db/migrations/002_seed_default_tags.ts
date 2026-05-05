import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // INSERT OR IGNORE: safe to re-run; existing rows untouched
  await sql`INSERT OR IGNORE INTO tags (id, rpg_attribute, color_hex) VALUES
    ('cuda',     'Systems',       '#E1FF00'),
    ('leetcode', 'Algorithms',    '#00E5FF'),
    ('math',     'Logic',         '#FF9500'),
    ('writing',  'Communication', '#FF2D55'),
    ('reading',  'Knowledge',     '#30D158'),
    ('design',   'Craft',         '#BF5AF2')
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM tags WHERE id IN ('cuda','leetcode','math','writing','reading','design')`.execute(db);
}
