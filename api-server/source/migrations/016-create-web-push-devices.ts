import { definePostgresMigration } from "gruber";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "web_push_devices" (
        "id" SERIAL PRIMARY KEY,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "registration_id" INTEGER REFERENCES registrations (id) ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "endpoint" VARCHAR(255) NOT NULL,
        "keys" JSONB NOT NULL,
        "categories" JSONB NOT NULL,
        "expires_at" TIMESTAMP DEFAULT NULL
      );
    `;
  },
  async down(sql) {
    await sql`DROP TABLE "web_push_devices"`;
  },
});
