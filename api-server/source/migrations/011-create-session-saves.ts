import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "session_saves" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "session_id" INTEGER NOT NULL REFERENCES "sessions" (id) ON DELETE CASCADE,
        "registration_id" INTEGER NOT NULL REFERENCES "registrations" (id) ON DELETE CASCADE
      )
    `;
    await sql`
      CREATE INDEX "session_saves_session_id" ON "session_saves" ("session_id")
    `;
    await sql`
      CREATE INDEX "session_saves_registration_id" ON "session_saves" ("registration_id")
    `;
  },
  async down(sql) {
    await sql`DROP INDEX "session_saves_registration_id"`;
    await sql`DROP INDEX "session_saves_session_id"`;
    await sql`DROP TABLE "session_saves"`;
  },
});
