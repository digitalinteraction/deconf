import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      ALTER TABLE oauth2_tokens
        ALTER COLUMN scope TYPE VARCHAR(1024),
        ALTER COLUMN access_token TYPE VARCHAR(1024),
        ALTER COLUMN refresh_token TYPE VARCHAR(1024)
    `;
  },
  async down(sql) {
    // don't alter it back
  },
});
