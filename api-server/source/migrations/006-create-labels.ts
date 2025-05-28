import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "labels" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "title" JSONB NOT NULL,
        "icon" VARCHAR(32) DEFAULT NULL,
        "taxonomy_id" INTEGER NOT NULL REFERENCES "taxonomies" (id) ON DELETE CASCADE,
        "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `;
    await sql`
      CREATE INDEX "labels_taxonomy_id" ON "labels" ("taxonomy_id")
    `;
  },
  async down(sql) {
    await sql`DROP INDEX "labels_taxonomy_id"`;
    await sql`DROP TABLE "labels"`;
  },
});
