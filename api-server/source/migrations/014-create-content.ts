import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "content" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "slug" VARCHAR(64) NOT NULL,
        "body" JSONB NOT NULL DEFAULT '{}'::JSONB,
        "conference_id" INTEGER NOT NULL REFERENCES "conferences" (id) ON DELETE CASCADE,
        "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `;
  },
  async down(sql) {
    await sql`DROP TABLE "content"`;
  },
});
