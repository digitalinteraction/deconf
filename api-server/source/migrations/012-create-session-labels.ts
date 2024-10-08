import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "session_labels" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "session_id" INTEGER NOT NULL REFERENCES "sessions" (id) ON DELETE CASCADE,
        "label_id" INTEGER NOT NULL REFERENCES "labels" (id) ON DELETE CASCADE
      )
    `
    await sql`
      CREATE INDEX "session_labels_session_id" ON "session_labels" ("session_id")
    `
    await sql`
      CREATE INDEX "session_labels_label_id" ON "session_labels" ("label_id")
    `
  },
  async down(sql) {
    await sql`DROP INDEX "session_labels_label_id"`
    await sql`DROP INDEX "session_labels_session_id"`
    await sql`DROP TABLE "session_labels"`
  },
})
