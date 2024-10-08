import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "session_people" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "session_id" INTEGER NOT NULL REFERENCES "sessions" (id) ON DELETE CASCADE,
        "person_id" INTEGER NOT NULL REFERENCES "people" (id) ON DELETE CASCADE
      )
    `
    await sql`
      CREATE INDEX "session_people_session_id" ON "session_people" ("session_id")
    `
    await sql`
      CREATE INDEX "session_people_person_id" ON "session_people" ("person_id")
    `
  },
  async down(sql) {
    await sql`DROP INDEX "session_people_person_id"`
    await sql`DROP INDEX "session_people_session_id"`
    await sql`DROP TABLE "session_people"`
  },
})
