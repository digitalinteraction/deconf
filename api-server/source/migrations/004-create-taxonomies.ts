import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "taxonomies" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "title" JSONB NOT NULL,
        "icon" VARCHAR(32) DEFAULT NULL,
        "conference_id" INTEGER NOT NULL REFERENCES "conferences" (id) ON DELETE CASCADE
      )
    `
    await sql`
      CREATE INDEX "taxonomies_conference_id" ON "taxonomies" ("conference_id")
    `
  },
  async down(sql) {
    await sql`DROP INDEX "taxonomies_conference_id"`
    await sql`DROP TABLE "taxonomies"`
  },
})
