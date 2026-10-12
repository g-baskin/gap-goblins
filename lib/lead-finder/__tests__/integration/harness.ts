/**
 * Real-Postgres harness for Lead Finder integration tests.
 *
 * Uses LEAD_FINDER_TEST_DATABASE_URL, defaulting to the local compose database
 * `gap_goblins_test` on port 5442. Creates the database if needed and applies
 * every migration in lib/db/drizzle. When Postgres is unreachable the suites
 * are skipped with a visible warning rather than faked.
 */

import { randomUUID } from "node:crypto";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import type { LeadFinderDb } from "../../db";

export const TEST_DB_URL =
  process.env.LEAD_FINDER_TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5442/gap_goblins_test";

let client: ReturnType<typeof postgres> | null = null;
let ready: Promise<LeadFinderDb | null> | null = null;

async function ensureDatabase(): Promise<boolean> {
  const url = new URL(TEST_DB_URL);
  const dbName = url.pathname.replace(/^\//, "");
  if (!/^[a-z0-9_]+$/i.test(dbName)) throw new Error(`Unsafe test database name: ${dbName}`);
  url.pathname = "/postgres";
  const admin = postgres(url.toString(), { max: 1, connect_timeout: 3, onnotice: () => {} });
  try {
    const rows = await admin`select 1 from pg_database where datname = ${dbName}`;
    if (rows.length === 0) await admin.unsafe(`create database "${dbName}"`);
    return true;
  } catch (error) {
    console.warn(
      `[lead-finder integration] Postgres not reachable at ${url.host}; skipping DB suites.`,
      error instanceof Error ? error.message : error,
    );
    return false;
  } finally {
    await admin.end({ timeout: 2 });
  }
}

/** Returns a migrated test database, or null when Postgres is unavailable. */
export function getTestDb(): Promise<LeadFinderDb | null> {
  if (!ready) {
    ready = (async () => {
      if (!(await ensureDatabase())) return null;
      client = postgres(TEST_DB_URL, { max: 5, prepare: false, onnotice: () => {} });
      const db = drizzle({ client, schema });
      await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../../db/drizzle") });
      return db;
    })();
  }
  return ready;
}

export async function closeTestDb() {
  await client?.end({ timeout: 2 });
  client = null;
  ready = null;
}

export async function createTenant(db: LeadFinderDb, label = "t"): Promise<string> {
  const slug = `${label}-${randomUUID().slice(0, 8)}`;
  const [row] = await db
    .insert(schema.tenants)
    .values({ slug, name: `Test ${slug}` })
    .returning({ id: schema.tenants.id });
  return row.id;
}
