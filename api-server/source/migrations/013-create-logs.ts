import { definePostgresMigration } from 'gruber'

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "logs" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "visitor VARCHAR(64) NOT NULL,
        "name VARCHAR(64) NOT NULL,
        "payload" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `
  },
  async down(sql) {
    await sql`DROP TABLE "logs"`
  },
})
