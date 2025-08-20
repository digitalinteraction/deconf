import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      ALTER TABLE "people"
        ALTER COLUMN name TYPE VARCHAR(128),
        ALTER COLUMN subtitle TYPE VARCHAR(128);
    `;
  },
  async down(sql) {
    // don't alter it back
  },
});
