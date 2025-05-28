import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "consented_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "email" VARCHAR(255) DEFAULT NULL UNIQUE,
        "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `;
  },
  async down(sql) {
    await sql`
      DROP TABLE "users"
    `;
  },
});
