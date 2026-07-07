import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "\n⚠️  [db] DATABASE_URL is not set.\n" +
    "   Copy .env.example to .env and set your PostgreSQL connection string.\n" +
    "   Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/careerconnect\n"
  );
}

export const pool = new Pool({
  connectionString: connectionString ?? "postgresql://localhost:5432/careerconnect",
  // Connection pool settings for local dev
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Graceful pool error handling (prevents unhandled rejection crashes)
pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
