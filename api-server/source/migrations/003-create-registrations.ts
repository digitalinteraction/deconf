import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "registrations" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "name" VARCHAR(255) NOT NULL,
        "avatar" VARCHAR(255) DEFAULT NULL,
        "user_id" INTEGER NOT NULL REFERENCES "users" (id),
        "conference_id" INTEGER NOT NULL REFERENCES "conferences" (id) ON DELETE CASCADE,
        "role" VARCHAR(32) NOT NULL
      )
    `
    await sql`
      CREATE INDEX "registrations_user_id" ON "registrations" ("user_id")
    `
    await sql`
      CREATE INDEX "registrations_conference_id" ON "registrations" ("conference_id")
    `
  },
  async down(sql) {
    await sql`DROP INDEX "registrations_conference_id"`
    await sql`DROP INDEX "registrations_user_id"`
    await sql`DROP TABLE "registrations"`
  },
})
