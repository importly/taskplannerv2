import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // INSERT OR IGNORE: safe to re-run; existing rows untouched
  await sql`INSERT OR IGNORE INTO tags (id, rpg_attribute, color_hex) VALUES
    ('reading',  'Research',      '#30D158'),
    ('math',     'ML/Math',       '#FF9500'),
    ('cuda',     'Systems',       '#E1FF00'),
    ('leetcode', 'Algorithms',    '#00E5FF'),
    ('design',   'Engineering',   '#BF5AF2'),
    ('writing',  'Communication', '#FF2D55')
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM tags WHERE id IN ('cuda','leetcode','math','writing','reading','design')`.execute(db);
}
