import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "registrations" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "name" VARCHAR(255) NOT NULL,
        "avatar_id" INTEGER DEFAULT NULL REFERENCES "assets" (id) ON DELETE SET NULL,
        "user_id" INTEGER NOT NULL REFERENCES "users" (id) ON DELETE CASCADE,
        "conference_id" INTEGER NOT NULL REFERENCES "conferences" (id) ON DELETE CASCADE,
        "role" VARCHAR(32) NOT NULL,
        "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `;
    await sql`
      CREATE INDEX "registrations_user_id" ON "registrations" ("user_id")
    `;
    await sql`
      CREATE INDEX "registrations_conference_id" ON "registrations" ("conference_id")
    `;
  },
  async down(sql) {
    await sql`DROP INDEX "registrations_conference_id"`;
    await sql`DROP INDEX "registrations_user_id"`;
    await sql`DROP TABLE "registrations"`;
  },
});
