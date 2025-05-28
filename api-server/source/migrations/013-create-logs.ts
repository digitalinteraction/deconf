import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "logs" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "visitor" VARCHAR(64) NOT NULL,
        "name" VARCHAR(64) NOT NULL,
        "payload" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `;
  },
  async down(sql) {
    await sql`DROP TABLE "logs"`;
  },
});
