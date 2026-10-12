/**
 * Load .env.local for the worker process in local development.
 * In production (Railway), environment variables are injected directly.
 * This file is a no-op if .env.local does not exist.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const { config } = await import("dotenv");
  config({ path: envPath });
}
