import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "session_links" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "title" JSONB NOT NULL,
        "url" JSONB NOT NULL DEFAULT '{}'::JSONB,
        "language" VARCHAR(32) DEFAULT NULL,
        "session_id" INTEGER NOT NULL REFERENCES "sessions" (id) ON DELETE CASCADE
      )
    `
    await sql`
      CREATE INDEX "session_links_session_id" ON "session_links" ("session_id")
    `
  },
  async down(sql) {
    await sql`DROP INDEX "session_links_session_id"`
    await sql`DROP TABLE "session_links"`
  },
})
