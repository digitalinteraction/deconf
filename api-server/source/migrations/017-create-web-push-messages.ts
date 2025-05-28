import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "web_push_messages" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "device_id" INTEGER REFERENCES web_push_devices (id) ON DELETE CASCADE,
        "payload" JSONB NOT NULL,
        "retries" integer DEFAULT 0,
        "state" varchar(32) DEFAULT 'pending'
      );
    `;
  },
  async down(sql) {
    await sql`DROP TABLE "web_push_messages"`;
  },
});
