import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "consented" TIMESTAMP NOT NULL DEFAULT NOW(),
        "email" VARCHAR(255) DEFAULT NULL,
        "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `
  },
  async down(sql) {
    await sql`
      DROP TABLE "users"
    `
  },
})
