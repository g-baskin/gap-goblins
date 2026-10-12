import { and, eq } from "drizzle-orm";
import { automationFlows } from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import { logger } from "@/lib/logger";
import { type AutomationEnrollment, enrollContactInFlow } from "./enrollments";
import type { AutomationTriggerType } from "./types";

type AudienceFilter = {
  statuses?: string[];
  status?: string;
  tags?: string[];
  tag?: string;
  stageIds?: string[];
  stageId?: string;
  stageSlugs?: string[];
  stageSlug?: string;
};

export type ContactStatusChangedTrigger = {
  contactId: string;
  status: string | null;
};

export type ContactTagAddedTrigger = {
  contactId: string;
  tags: string[];
};

export type DealStageChangedTrigger = {
  contactId: string;
  stageId: string | null;
  stageSlug?: string | null;
};

export async function enrollContactForTrigger(
  triggerType: AutomationTriggerType,
  contactId: string,
): Promise<AutomationEnrollment[]> {
  return safelyEnrollContact(triggerType, contactId, () => true);
}

export async function enrollContactForStatusChange(
  event: ContactStatusChangedTrigger,
): Promise<AutomationEnrollment[]> {
  return safelyEnrollContact("contact_status_changed", event.contactId, (flow) =>
    matchesStatusFilter(flow.audienceFilter, event.status),
  );
}

export async function enrollContactForTagAdded(
  event: ContactTagAddedTrigger,
): Promise<AutomationEnrollment[]> {
  return safelyEnrollContact("contact_tag_added", event.contactId, (flow) =>
    matchesTagFilter(flow.audienceFilter, event.tags),
  );
}

export async function enrollContactForDealStageChange(
  event: DealStageChangedTrigger,
): Promise<AutomationEnrollment[]> {
  return safelyEnrollContact("deal_stage_changed", event.contactId, (flow) =>
    matchesStageFilter(flow.audienceFilter, event.stageId, event.stageSlug ?? null),
  );
}

async function safelyEnrollContact(
  triggerType: AutomationTriggerType,
  contactId: string,
  matchesFlow: (flow: { id: string; audienceFilter: unknown }) => boolean,
): Promise<AutomationEnrollment[]> {
  try {
    const flows = await getActiveFlowsByTrigger(triggerType);
    const enrollments: AutomationEnrollment[] = [];

    for (const flow of flows) {
      if (!matchesFlow(flow)) continue;
      const enrollment = await enrollContactInFlow(flow.id, contactId);
      if (enrollment) enrollments.push(enrollment);
    }

    return enrollments;
  } catch (error) {
    logger.error("Failed to enroll contact for automation trigger:", {
      triggerType,
      contactId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

async function getActiveFlowsByTrigger(triggerType: AutomationTriggerType) {
  return db
    .select({ id: automationFlows.id, audienceFilter: automationFlows.audienceFilter })
    .from(automationFlows)
    .where(and(eq(automationFlows.status, "active"), eq(automationFlows.triggerType, triggerType)));
}

function parseAudienceFilter(value: unknown): AudienceFilter {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as AudienceFilter;
}

function matchesStatusFilter(value: unknown, status: string | null): boolean {
  if (!status) return false;
  const filter = parseAudienceFilter(value);
  const statuses = normalizeList(filter.statuses ?? filter.status);
  return statuses.length === 0 || statuses.includes(status);
}

function matchesTagFilter(value: unknown, tags: string[]): boolean {
  if (tags.length === 0) return false;
  const filter = parseAudienceFilter(value);
  const allowedTags = normalizeList(filter.tags ?? filter.tag);
  return allowedTags.length === 0 || tags.some((tag) => allowedTags.includes(tag));
}

function matchesStageFilter(
  value: unknown,
  stageId: string | null,
  stageSlug: string | null,
): boolean {
  const filter = parseAudienceFilter(value);
  const stageIds = normalizeList(filter.stageIds ?? filter.stageId);
  const stageSlugs = normalizeList(filter.stageSlugs ?? filter.stageSlug);

  if (stageIds.length === 0 && stageSlugs.length === 0) return true;
  return Boolean(
    (stageId && stageIds.includes(stageId)) || (stageSlug && stageSlugs.includes(stageSlug)),
  );
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return typeof value === "string" && value.length > 0 ? [value] : [];
}
