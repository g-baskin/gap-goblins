import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, humanNudges, outreachCampaigns, outreachContacts } from "@/lib/db/schema";
import { createHumanNudge } from "@/lib/nudges/human-nudges";

export const UNRESPONSIVE_NUDGE_TYPE = "unresponsive";
export const UNRESPONSIVE_LOOKBACK_DAYS = 5;
export const UNRESPONSIVE_SCAN_LIMIT = 200;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type UnresponsiveLeadCandidate = {
  outreachContactId: string;
  crmContactId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  status: string | null;
  optOut: boolean | null;
  unsubscribedAt: string | null;
  repliedAt: string | null;
  currentStep: number | null;
  email1SentAt: string | null;
  email2SentAt: string | null;
  email3SentAt: string | null;
  campaignName: string | null;
};

export interface GenerateUnresponsiveLeadNudgesOptions {
  now?: Date;
  lookbackDays?: number;
  limit?: number;
}

export interface GenerateUnresponsiveLeadNudgesResult {
  scanned: number;
  created: number;
  skipped: number;
}

export async function generateUnresponsiveLeadNudges(
  options: GenerateUnresponsiveLeadNudgesOptions = {},
): Promise<GenerateUnresponsiveLeadNudgesResult> {
  const now = options.now ?? new Date();
  const lookbackDays = options.lookbackDays ?? UNRESPONSIVE_LOOKBACK_DAYS;
  const limit = options.limit ?? UNRESPONSIVE_SCAN_LIMIT;
  const cutoff = new Date(now.getTime() - lookbackDays * MS_PER_DAY).toISOString();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const candidates = await loadUnresponsiveLeadCandidates(cutoff, limit);
  let created = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    if (!isEligibleCandidate(candidate)) {
      skipped++;
      continue;
    }

    const lastOutboundAt = getLastOutboundAt(candidate);
    if (!lastOutboundAt) {
      skipped++;
      continue;
    }

    const dedupKey = `outreach-contact:${candidate.outreachContactId}:unresponsive:${month}`;
    if (await humanNudgeDedupExists(dedupKey)) {
      skipped++;
      continue;
    }

    const contactName = formatContactName(candidate);
    const daysSilent = daysBetween(now, new Date(lastOutboundAt));
    await createHumanNudge({
      contactId: candidate.crmContactId,
      nudgeType: UNRESPONSIVE_NUDGE_TYPE,
      title: `Re-engage ${contactName}`,
      message: `${contactName} hasn't replied in ${daysSilent} days after ${describeLastEmail(candidate)}. Try a different angle or offer.`,
      suggestedAction: candidate.phone ? "text" : "email",
      priority: "medium",
      dueDate: now.toISOString(),
      dedupKey,
      metadata: {
        reason: "unresponsive_lead",
        outreach_contact_id: candidate.outreachContactId,
        campaign_name: candidate.campaignName,
        days_silent: daysSilent,
        last_outbound_at: lastOutboundAt,
        current_step: candidate.currentStep,
        contact_email: candidate.email,
      },
    });
    created++;
  }

  return { scanned: candidates.length, created, skipped };
}

async function loadUnresponsiveLeadCandidates(
  cutoff: string,
  limit: number,
): Promise<UnresponsiveLeadCandidate[]> {
  return db
    .select({
      outreachContactId: outreachContacts.id,
      crmContactId: contacts.id,
      email: outreachContacts.email,
      firstName: outreachContacts.firstName,
      lastName: outreachContacts.lastName,
      company: outreachContacts.company,
      phone: outreachContacts.phone,
      status: outreachContacts.status,
      optOut: outreachContacts.optOut,
      unsubscribedAt: outreachContacts.unsubscribedAt,
      repliedAt: outreachContacts.repliedAt,
      currentStep: outreachContacts.currentStep,
      email1SentAt: outreachContacts.email1SentAt,
      email2SentAt: outreachContacts.email2SentAt,
      email3SentAt: outreachContacts.email3SentAt,
      campaignName: outreachCampaigns.name,
    })
    .from(outreachContacts)
    .leftJoin(contacts, eq(outreachContacts.email, contacts.email))
    .leftJoin(outreachCampaigns, eq(outreachContacts.campaignId, outreachCampaigns.id))
    .where(
      and(
        inProgressOutreachCondition(),
        isNull(outreachContacts.repliedAt),
        or(
          lte(outreachContacts.email3SentAt, cutoff),
          lte(outreachContacts.email2SentAt, cutoff),
          lte(outreachContacts.email1SentAt, cutoff),
        ),
      ),
    )
    .orderBy(
      desc(
        sql`coalesce(${outreachContacts.email3SentAt}, ${outreachContacts.email2SentAt}, ${outreachContacts.email1SentAt})`,
      ),
    )
    .limit(limit);
}

function inProgressOutreachCondition() {
  return or(eq(outreachContacts.status, "active"), eq(outreachContacts.status, "completed"));
}

async function humanNudgeDedupExists(dedupKey: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: humanNudges.id })
    .from(humanNudges)
    .where(eq(humanNudges.dedupKey, dedupKey))
    .limit(1);
  return Boolean(existing);
}

function isEligibleCandidate(candidate: UnresponsiveLeadCandidate): boolean {
  return candidate.optOut !== true && !candidate.unsubscribedAt && !candidate.repliedAt;
}

function getLastOutboundAt(candidate: UnresponsiveLeadCandidate): string | null {
  return candidate.email3SentAt ?? candidate.email2SentAt ?? candidate.email1SentAt;
}

function formatContactName(candidate: UnresponsiveLeadCandidate): string {
  const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ").trim();
  return name || candidate.email;
}

function describeLastEmail(candidate: UnresponsiveLeadCandidate): string {
  if (candidate.email3SentAt) return "email 3";
  if (candidate.email2SentAt) return "email 2";
  return "email 1";
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / MS_PER_DAY));
}
