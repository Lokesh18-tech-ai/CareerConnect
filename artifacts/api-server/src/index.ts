import app from "./app";
import { logger } from "./lib/logger";

// Environment variables are loaded via Node.js --env-file flag in package.json scripts.
// This ensures they are available before any module (including @workspace/db) is initialized.

const rawPort = process.env["PORT"] ?? "8081";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening on http://localhost:" + port);
});
