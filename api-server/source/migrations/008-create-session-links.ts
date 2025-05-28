import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "session_links" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "title" JSONB NOT NULL DEFAULT '{}'::JSONB,
        "url" JSONB NOT NULL DEFAULT '{}'::JSONB,
        "session_id" INTEGER NOT NULL REFERENCES "sessions" (id) ON DELETE CASCADE,
        "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `;
    await sql`
      CREATE INDEX "session_links_session_id" ON "session_links" ("session_id")
    `;
  },
  async down(sql) {
    await sql`DROP INDEX "session_links_session_id"`;
    await sql`DROP TABLE "session_links"`;
  },
});
