import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      ALTER TABLE "labels"
        ALTER COLUMN icon TYPE VARCHAR(128);
    `;
  },
  async down(sql) {
    // don't alter it back
  },
});
