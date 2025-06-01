import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      ALTER TABLE "sessions"
      ADD COLUMN "visibility" VARCHAR(32) NOT NULL DEFAULT 'private'
    `;
  },
  async down(sql) {
    await sql`
      ALTER TABLE "sessions"
      DROP COLUMN "visibility"
    `;
  },
});
