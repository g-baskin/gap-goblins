import { and, desc, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  automationEnrollments,
  contacts,
  deals,
  humanNudges,
  outreachReplies,
} from "@/lib/db/schema";
import { createHumanNudge } from "@/lib/nudges/human-nudges";

export const HOT_LEAD_NUDGE_TYPE = "hot_lead";
export const HOT_LEAD_LOOKBACK_DAYS = 30;
export const HOT_LEAD_SCAN_LIMIT = 200;
export const HOT_LEAD_MIN_ENGAGEMENT_SCORE = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HOT_REPLY_INTENTS = ["schedule_call", "wants_info", "objection"] as const;

type HotLeadCandidate = {
  contactId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  company: string | null;
  contactStatus: string | null;
  tags: string[] | null;
  latestSourceDetail: string | null;
  lastTouchDate: string | null;
  dealId: string | null;
  dealName: string | null;
  signalAt: string | null;
  signalSource: string;
  signalDetail: string | null;
  engagementScore: number | null;
};

export interface GenerateHotLeadNudgesOptions {
  now?: Date;
  lookbackDays?: number;
  limit?: number;
  minEngagementScore?: number;
}

export interface GenerateHotLeadNudgesResult {
  scanned: number;
  created: number;
  skipped: number;
}

export async function generateHotLeadNudges(
  options: GenerateHotLeadNudgesOptions = {},
): Promise<GenerateHotLeadNudgesResult> {
  const now = options.now ?? new Date();
  const lookbackDays = options.lookbackDays ?? HOT_LEAD_LOOKBACK_DAYS;
  const limit = options.limit ?? HOT_LEAD_SCAN_LIMIT;
  const minEngagementScore = options.minEngagementScore ?? HOT_LEAD_MIN_ENGAGEMENT_SCORE;
  const since = new Date(now.getTime() - lookbackDays * MS_PER_DAY).toISOString();

  const candidates = await loadHotLeadCandidates({ since, limit, minEngagementScore });
  let created = 0;
  let skipped = 0;
  const quarter = getQuarterParts(now);

  for (const candidate of dedupeCandidates(candidates)) {
    if (isClosedContact(candidate.contactStatus)) {
      skipped++;
      continue;
    }

    const dedupKey = `contact:${candidate.contactId}:hot_lead:${quarter.year}-Q${quarter.quarter}`;
    if (await humanNudgeDedupExists(dedupKey)) {
      skipped++;
      continue;
    }

    const contactName = formatContactName(candidate);
    await createHumanNudge({
      contactId: candidate.contactId,
      dealId: candidate.dealId,
      nudgeType: HOT_LEAD_NUDGE_TYPE,
      title: `${contactName} is a hot lead`,
      message: buildHotLeadMessage(contactName, candidate),
      suggestedAction: "call",
      priority: "high",
      dueDate: now.toISOString(),
      dedupKey,
      metadata: {
        reason: "hot_lead",
        signal_source: candidate.signalSource,
        signal_detail: candidate.signalDetail,
        signal_at: candidate.signalAt,
        engagement_score: candidate.engagementScore,
      },
    });
    created++;
  }

  return { scanned: candidates.length, created, skipped };
}

async function loadHotLeadCandidates(options: {
  since: string;
  limit: number;
  minEngagementScore: number;
}): Promise<HotLeadCandidate[]> {
  const automationCandidates = await db
    .select({
      contactId: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      company: contacts.company,
      contactStatus: contacts.contactStatus,
      tags: contacts.tags,
      latestSourceDetail: contacts.latestSourceDetail,
      lastTouchDate: contacts.lastTouchDate,
      dealId: deals.id,
      dealName: deals.name,
      signalAt: automationEnrollments.lastEventAt,
      signalSource: sql<string>`'automation'`,
      signalDetail: automationEnrollments.engagementStage,
      engagementScore: automationEnrollments.engagementScore,
    })
    .from(automationEnrollments)
    .innerJoin(contacts, eq(automationEnrollments.contactId, contacts.id))
    .leftJoin(deals, and(eq(deals.contactId, contacts.id), eq(deals.status, "open")))
    .where(
      and(
        isNotNull(automationEnrollments.contactId),
        gte(automationEnrollments.lastEventAt, options.since),
        or(
          eq(automationEnrollments.engagementStage, "hot"),
          gte(automationEnrollments.engagementScore, options.minEngagementScore),
          sql`${contacts.tags} @> ARRAY['automation-hot']::text[]`,
        ),
      ),
    )
    .orderBy(desc(automationEnrollments.lastEventAt))
    .limit(options.limit);

  const replyCandidates = await db
    .select({
      contactId: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      company: contacts.company,
      contactStatus: contacts.contactStatus,
      tags: contacts.tags,
      latestSourceDetail: contacts.latestSourceDetail,
      lastTouchDate: contacts.lastTouchDate,
      dealId: outreachReplies.crmDealId,
      dealName: deals.name,
      signalAt: outreachReplies.receivedAt,
      signalSource: sql<string>`'outreach_reply'`,
      signalDetail: outreachReplies.intent,
      engagementScore: sql<number>`10`,
    })
    .from(outreachReplies)
    .innerJoin(contacts, eq(outreachReplies.crmContactId, contacts.id))
    .leftJoin(deals, eq(outreachReplies.crmDealId, deals.id))
    .where(
      and(
        eq(outreachReplies.sentiment, "positive"),
        inArray(outreachReplies.intent, HOT_REPLY_INTENTS),
        isNotNull(outreachReplies.crmContactId),
        gte(outreachReplies.receivedAt, options.since),
      ),
    )
    .orderBy(desc(outreachReplies.receivedAt))
    .limit(options.limit);

  return [...automationCandidates, ...replyCandidates];
}

async function humanNudgeDedupExists(dedupKey: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: humanNudges.id })
    .from(humanNudges)
    .where(eq(humanNudges.dedupKey, dedupKey))
    .limit(1);
  return Boolean(existing);
}

function dedupeCandidates(candidates: HotLeadCandidate[]): HotLeadCandidate[] {
  const byContact = new Map<string, HotLeadCandidate>();
  for (const candidate of candidates) {
    const existing = byContact.get(candidate.contactId);
    if (!existing || compareSignalRecency(candidate.signalAt, existing.signalAt) > 0) {
      byContact.set(candidate.contactId, candidate);
    }
  }
  return Array.from(byContact.values());
}

function compareSignalRecency(left: string | null, right: string | null): number {
  return new Date(left ?? 0).getTime() - new Date(right ?? 0).getTime();
}

function isClosedContact(status: string | null): boolean {
  return status === "customer" || status === "lost";
}

function formatContactName(candidate: HotLeadCandidate): string {
  const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ").trim();
  return name || candidate.email;
}

function buildHotLeadMessage(contactName: string, candidate: HotLeadCandidate): string {
  const source =
    candidate.signalSource === "outreach_reply"
      ? describeReplySignal(candidate.signalDetail)
      : describeAutomationSignal(candidate.signalDetail, candidate.engagementScore);
  const company = candidate.company ? ` at ${candidate.company}` : "";
  const deal = candidate.dealName ? ` Deal: ${candidate.dealName}.` : "";
  return `${contactName}${company} is showing high buying intent from ${source}. Follow up now while the interest is fresh.${deal}`;
}

function describeReplySignal(intent: string | null): string {
  if (intent === "schedule_call") return "a positive reply asking to schedule";
  if (intent === "wants_info") return "a positive reply asking for more information";
  if (intent === "objection") return "an engaged reply with a live objection";
  return "a positive outreach reply";
}

function describeAutomationSignal(detail: string | null, score: number | null): string {
  if (detail === "hot") return "automation engagement";
  if (score != null) return `automation engagement score ${score}`;
  return "automation engagement";
}

function getQuarterParts(date: Date): { year: number; quarter: number } {
  return {
    year: date.getUTCFullYear(),
    quarter: Math.floor(date.getUTCMonth() / 3) + 1,
  };
}
