import { Client } from "pg";

// Usa tu cadena real. Para local sin ssl:
const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://root@localhost:26257/shareboard?sslmode=disable";

export const db = new Client({ connectionString });

export async function connectDB() {
    await db.connect();

    // Crea tabla si no existe
    await db.query(`
    CREATE TABLE IF NOT EXISTS board (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      short_id STRING UNIQUE NOT NULL,
      content STRING DEFAULT ''
    );
  `);
}
