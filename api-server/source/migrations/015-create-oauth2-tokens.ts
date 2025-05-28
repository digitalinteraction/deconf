import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "oauth2_tokens" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "kind" VARCHAR(32) NOT NULL,
        "scope" VARCHAR(255) NOT NULL,
        "access_token" VARCHAR(255) NOT NULL,
        "refresh_token" VARCHAR(255) DEFAULT NULL,
        "user_id" INTEGER NOT NULL REFERENCES "users" (id) ON DELETE CASCADE,
        "expires_at" TIMESTAMP DEFAULT NULL
      )
    `;
  },
  async down(sql) {
    await sql`DROP TABLE "oauth2_tokens"`;
  },
});
