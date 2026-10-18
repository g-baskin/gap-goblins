import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/lib/db/schema";

/**
 * The database handle every Lead Finder service takes as its first argument.
 * Web routes pass `db` from "@/lib/db"; the worker passes "@/lib/db/worker";
 * integration tests pass their own client. Services never import a client.
 */
export type LeadFinderDb = PostgresJsDatabase<typeof schema>;
export type LeadFinderTx = Parameters<Parameters<LeadFinderDb["transaction"]>[0]>[0];
export type LeadFinderExecutor = LeadFinderDb | LeadFinderTx;

/** Storage key prefix every tenant-owned object must live under. */
export function tenantStoragePrefix(tenantId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) throw new Error("Invalid tenant id");
  return `tenants/${tenantId}/`;
}

export function isTenantStorageKey(tenantId: string, key: string | null | undefined): boolean {
  if (!key) return false;
  return key.startsWith(tenantStoragePrefix(tenantId)) && !key.includes("..");
}
