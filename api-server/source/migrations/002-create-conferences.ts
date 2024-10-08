import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "conferences" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "slug" VARCHAR(64) NOT NULL UNIQUE,
        "title" JSONB NOT NULL,
        "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `
  },
  async down(sql) {
    await sql`
      DROP TABLE "conferences"
    `
  },
})
