import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "assets" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "title" VARCHAR(64) NOT NULL,
        "url" VARCHAR(64) NOT NULL,
        "conference_id" INTEGER NOT NULL REFERENCES "conferences" (id) ON DELETE CASCADE,
        "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `;
    await sql`
      CREATE INDEX "assets_conference_id" ON "assets" ("conference_id")
    `;
  },
  async down(sql) {
    await sql`DROP INDEX "assets_conference_id"`;
    await sql`DROP TABLE "assets"`;
  },
});
