import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "people" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "name" VARCHAR(64) NOT NULL,
        "subtitle" VARCHAR(64) NOT NULL DEFAULT '',
        "bio" JSONB NOT NULL DEFAULT '{}'::JSONB,
        "conference_id" INTEGER NOT NULL REFERENCES "conferences" (id) ON DELETE CASCADE,
        "avatar_id" INTEGER DEFAULT NULL REFERENCES "assets" (id) ON DELETE SET NULL
      )
    `
    await sql`
      CREATE INDEX "people_conference_id" ON "people" ("conference_id")
    `
    await sql`
      CREATE INDEX "people_avatar_id" ON "people" ("avatar_id")
    `
  },
  async down(sql) {
    await sql`DROP INDEX "people_avatar_id"`
    await sql`DROP INDEX "people_conference_id"`
    await sql`DROP TABLE "people"`
  },
})
