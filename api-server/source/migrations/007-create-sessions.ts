import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "sessions" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "title" JSONB NOT NULL,
        "slug" VARCHAR(64) NOT NULL,
        "summary" JSONB NOT NULL DEFAULT '{}'::JSONB,
        "details" JSONB NOT NULL DEFAULT '{}'::JSONB,
        "languages" VARCHAR(32) DEFAULT 'en',
        "state" VARCHAR(32) NOT NULL,
        "start_date" TIMESTAMP DEFAULT NULL,
        "end_date" TIMESTAMP DEFAULT NULL,
        "conference_id" INTEGER NOT NULL REFERENCES "conferences" (id) ON DELETE CASCADE,
        "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `;
    await sql`
      CREATE INDEX "sessions_conference_id" ON "sessions" ("conference_id")
    `;
  },
  async down(sql) {
    await sql`DROP INDEX "sessions_conference_id"`;
    await sql`DROP TABLE "sessions"`;
  },
});
