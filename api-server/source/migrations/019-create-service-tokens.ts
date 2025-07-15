import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "service_tokens" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "token" VARCHAR(255) UNIQUE NOT NULL,
        "scope" VARCHAR(255) NOT NULL,
        "label" VARCHAR(255) NOT NULL DEFAULT ''
      )
    `;
  },
  async down(sql) {
    await sql`
      DROP TABLE "service_tokens"
    `;
  },
});
