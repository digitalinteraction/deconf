import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "labels" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "title" JSONB NOT NULL,
        "icon" VARCHAR(32) DEFAULT NULL,
        "taxonomy_id" INTEGER NOT NULL REFERENCES "taxonomies" (id) ON DELETE CASCADE
      )
    `
    await sql`
      CREATE INDEX "labels_taxonomy_id" ON "labels" ("taxonomy_id")
    `
  },
  async down(sql) {
    await sql`DROP INDEX "labels_taxonomy_id"`
    await sql`DROP TABLE "labels"`
  },
})
