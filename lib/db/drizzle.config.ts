import { defineConfig } from "drizzle-kit";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Load a .env file into process.env (values already set are NOT overwritten).
 * drizzle-kit runs outside of Node's --env-file context, so we load it manually.
 */
function loadEnvFile(envPath: string) {
  try {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // File doesn't exist — env vars may already be set in the shell
  }
}

// Load workspace root .env (lib/db is 2 levels deep: lib/db -> lib -> root)
loadEnvFile(resolve(process.cwd(), "../../.env"));
// Fallback: .env in current directory
loadEnvFile(resolve(process.cwd(), ".env"));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "\nDATABASE_URL is not set.\n" +
    "Create a .env file in the workspace root with:\n" +
    "  DATABASE_URL=postgresql://user:password@localhost:5432/careerconnect\n"
  );
}

export default defineConfig({
  // Relative path — drizzle-kit resolves from process.cwd() (the lib/db directory)
  // Do NOT use import.meta.dirname here; drizzle-kit's esbuild transpilation makes it undefined
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  out: "./drizzle",
  verbose: false,
  strict: false,
});
