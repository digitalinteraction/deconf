import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      ALTER TABLE session_saves
        ADD COLUMN notified JSONB DEFAULT '[]'::JSONB
    `;
  },
  async down(sql) {
    await sql`
      ALTER TABLE session_saves
        DROP COLUMN notified
    `;
  },
});
