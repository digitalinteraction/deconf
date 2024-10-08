import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "sessions" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "title" JSONB NOT NULL,
        "summary" JSONB NOT NULL DEFAULT '{}'::JSONB,
        "details" JSONB NOT NULL DEFAULT '{}'::JSONB,
        "languages" VARCHAR(32) DEFAULT 'en',
        "state" VARCHAR(32) NOT NULL,
        "start" TIMESTAMP DEFAULT NULL,
        "end" TIMESTAMP DEFAULT NULL,
        "conference_id" INTEGER NOT NULL REFERENCES "conferences" (id) ON DELETE CASCADE
      )
    `
    await sql`
      CREATE INDEX "sessions_conference_id" ON "sessions" ("conference_id")
    `
  },
  async down(sql) {
    await sql`DROP INDEX "sessions_conference_id"`
    await sql`DROP TABLE "sessions"`
  },
})
