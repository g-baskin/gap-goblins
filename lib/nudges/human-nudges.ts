import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { CrmError } from "@/lib/crm/types";
import { db } from "@/lib/db";
import { contacts, deals, humanNudges } from "@/lib/db/schema";
import type {
  HumanNudgeInput,
  HumanNudgeListResult,
  HumanNudgeStatus,
  ListHumanNudgesParams,
} from "./types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNIQUE_VIOLATION_CODE = "23505";

export type HumanNudge = typeof humanNudges.$inferSelect;

export async function listHumanNudges(
  params: ListHumanNudgesParams,
): Promise<HumanNudgeListResult> {
  const conditions = buildListConditions(params);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (params.page - 1) * params.limit;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: humanNudges.id,
        contactId: humanNudges.contactId,
        dealId: humanNudges.dealId,
        nudgeType: humanNudges.nudgeType,
        title: humanNudges.title,
        message: humanNudges.message,
        suggestedAction: humanNudges.suggestedAction,
        priority: humanNudges.priority,
        dueDate: humanNudges.dueDate,
        status: humanNudges.status,
        snoozedUntil: humanNudges.snoozedUntil,
        deliveredVia: humanNudges.deliveredVia,
        deliveredAt: humanNudges.deliveredAt,
        actedAt: humanNudges.actedAt,
        dismissedAt: humanNudges.dismissedAt,
        assignedToUserId: humanNudges.assignedToUserId,
        dedupKey: humanNudges.dedupKey,
        metadata: humanNudges.metadata,
        createdBy: humanNudges.createdBy,
        createdAt: humanNudges.createdAt,
        updatedAt: humanNudges.updatedAt,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        dealName: deals.name,
      })
      .from(humanNudges)
      .leftJoin(contacts, eq(humanNudges.contactId, contacts.id))
      .leftJoin(deals, eq(humanNudges.dealId, deals.id))
      .where(whereClause)
      .orderBy(desc(humanNudges.dueDate), desc(humanNudges.createdAt))
      .limit(params.limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(humanNudges).where(whereClause),
  ]);

  return {
    nudges: rows.map(mapNudgeRow),
    total: Number(countRows[0]?.count ?? 0),
    page: params.page,
    limit: params.limit,
  };
}

export async function getHumanNudge(nudgeId: string): Promise<HumanNudge> {
  assertUuid(nudgeId, "Nudge not found");

  const [nudge] = await db.select().from(humanNudges).where(eq(humanNudges.id, nudgeId)).limit(1);
  if (!nudge) {
    throw new CrmError("Nudge not found", 404);
  }

  return nudge;
}

export async function createHumanNudge(input: HumanNudgeInput): Promise<HumanNudge> {
  if (input.contactId) {
    await assertContactExists(input.contactId);
  }
  if (input.dealId) {
    await assertDealExists(input.dealId);
  }

  const now = new Date().toISOString();
  const dueDate = input.dueDate ?? now;

  try {
    const [nudge] = await db
      .insert(humanNudges)
      .values({
        contactId: input.contactId ?? null,
        dealId: input.dealId ?? null,
        nudgeType: input.nudgeType,
        title: input.title,
        message: input.message,
        suggestedAction: input.suggestedAction ?? null,
        priority: input.priority ?? "medium",
        dueDate,
        status: "pending",
        assignedToUserId: input.assignedToUserId ?? null,
        dedupKey: input.dedupKey ?? null,
        metadata: input.metadata ?? {},
        createdBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!nudge) {
      throw new CrmError("Failed to create nudge", 500);
    }

    return nudge;
  } catch (error) {
    if (isUniqueViolation(error) && input.dedupKey) {
      const [existing] = await db
        .select()
        .from(humanNudges)
        .where(eq(humanNudges.dedupKey, input.dedupKey))
        .limit(1);
      if (existing) return existing;
    }
    throw error;
  }
}

export async function updateHumanNudge(
  nudgeId: string,
  input: Partial<{
    status: HumanNudgeStatus;
    snoozedUntil: string | null;
    title: string;
    message: string;
    suggestedAction: string | null;
    priority: string;
    dueDate: string;
    assignedToUserId: string | null;
    metadata: Record<string, unknown>;
  }>,
): Promise<HumanNudge> {
  await getHumanNudge(nudgeId);
  const now = new Date().toISOString();
  const updateData = buildUpdateData(input, now);

  const [updated] = await db
    .update(humanNudges)
    .set(updateData)
    .where(eq(humanNudges.id, nudgeId))
    .returning();

  if (!updated) {
    throw new CrmError("Nudge not found", 404);
  }

  return updated;
}

export async function snoozeHumanNudge(nudgeId: string, snoozedUntil: string): Promise<HumanNudge> {
  return updateHumanNudge(nudgeId, { status: "snoozed", snoozedUntil });
}

export async function dismissHumanNudge(nudgeId: string): Promise<HumanNudge> {
  return updateHumanNudge(nudgeId, { status: "dismissed", snoozedUntil: null });
}

export async function markHumanNudgeActed(nudgeId: string): Promise<HumanNudge> {
  return updateHumanNudge(nudgeId, { status: "acted", snoozedUntil: null });
}

export async function humanNudgeDedupExists(dedupKey: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: humanNudges.id })
    .from(humanNudges)
    .where(eq(humanNudges.dedupKey, dedupKey))
    .limit(1);
  return Boolean(existing);
}

function buildListConditions(params: ListHumanNudgesParams): SQL[] {
  const conditions: SQL[] = [];

  if (params.status && params.status !== "all") {
    conditions.push(eq(humanNudges.status, params.status));
  }
  if (params.priority && params.priority !== "all") {
    conditions.push(eq(humanNudges.priority, params.priority));
  }
  if (params.contactId) {
    conditions.push(eq(humanNudges.contactId, params.contactId));
  }
  if (params.dealId) {
    conditions.push(eq(humanNudges.dealId, params.dealId));
  }
  if (params.due === "due") {
    conditions.push(sql`${humanNudges.dueDate} <= now()`);
  } else if (params.due === "upcoming") {
    conditions.push(sql`${humanNudges.dueDate} > now()`);
  }

  return conditions;
}

function buildUpdateData(
  input: Partial<{
    status: HumanNudgeStatus;
    snoozedUntil: string | null;
    title: string;
    message: string;
    suggestedAction: string | null;
    priority: string;
    dueDate: string;
    assignedToUserId: string | null;
    metadata: Record<string, unknown>;
  }>,
  now: string,
): Partial<typeof humanNudges.$inferInsert> {
  const updateData: Partial<typeof humanNudges.$inferInsert> = { updatedAt: now };

  if (input.status !== undefined) {
    updateData.status = input.status;
    if (input.status === "acted") {
      updateData.actedAt = now;
      updateData.dismissedAt = null;
    } else if (input.status === "dismissed") {
      updateData.dismissedAt = now;
      updateData.actedAt = null;
    } else if (input.status === "pending") {
      updateData.snoozedUntil = null;
      updateData.actedAt = null;
      updateData.dismissedAt = null;
    }
  }

  if (input.snoozedUntil !== undefined) updateData.snoozedUntil = input.snoozedUntil;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.message !== undefined) updateData.message = input.message;
  if (input.suggestedAction !== undefined) updateData.suggestedAction = input.suggestedAction;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
  if (input.assignedToUserId !== undefined) updateData.assignedToUserId = input.assignedToUserId;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;

  return updateData;
}

async function assertContactExists(contactId: string): Promise<void> {
  assertUuid(contactId, "Contact not found");
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  if (!contact) {
    throw new CrmError("Contact not found", 404);
  }
}

async function assertDealExists(dealId: string): Promise<void> {
  assertUuid(dealId, "Deal not found");
  const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) {
    throw new CrmError("Deal not found", 404);
  }
}

function assertUuid(value: string, message: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new CrmError(message, 404);
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const maybeCode = (error as Error & { code?: string }).code;
  return maybeCode === UNIQUE_VIOLATION_CODE || /unique/i.test(error.message);
}

function mapNudgeRow(row: {
  id: string;
  contactId: string | null;
  dealId: string | null;
  nudgeType: string;
  title: string;
  message: string;
  suggestedAction: string | null;
  priority: string;
  dueDate: string;
  status: string;
  snoozedUntil: string | null;
  deliveredVia: string | null;
  deliveredAt: string | null;
  actedAt: string | null;
  dismissedAt: string | null;
  assignedToUserId: string | null;
  dedupKey: string | null;
  metadata: unknown;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
  dealName: string | null;
}): Record<string, unknown> {
  return {
    id: row.id,
    contact_id: row.contactId,
    deal_id: row.dealId,
    nudge_type: row.nudgeType,
    title: row.title,
    message: row.message,
    suggested_action: row.suggestedAction,
    priority: row.priority,
    due_date: row.dueDate,
    status: row.status,
    snoozed_until: row.snoozedUntil,
    delivered_via: row.deliveredVia,
    delivered_at: row.deliveredAt,
    acted_at: row.actedAt,
    dismissed_at: row.dismissedAt,
    assigned_to_user_id: row.assignedToUserId,
    dedup_key: row.dedupKey,
    metadata: row.metadata,
    created_by: row.createdBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    contact: row.contactId
      ? {
          id: row.contactId,
          first_name: row.contactFirstName,
          last_name: row.contactLastName,
          email: row.contactEmail,
        }
      : null,
    deal: row.dealId ? { id: row.dealId, name: row.dealName } : null,
  };
}
