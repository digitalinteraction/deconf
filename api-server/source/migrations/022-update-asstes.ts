import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      ALTER TABLE "assets"
        ALTER COLUMN url TYPE VARCHAR(255);
    `;
  },
  async down(sql) {
    // don't alter it back
  },
});
