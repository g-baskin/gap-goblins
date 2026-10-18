import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationThreads } from "@/lib/db/schema";
import { setSmsConsent } from "@/lib/messaging/inbox";
import {
  badRequest,
  consentBodySchema,
  isUuid,
  notFound,
  readJson,
  requireTenant,
} from "../../_lib";

type Params = { params: Promise<{ threadId: string }> };

async function contactOf(tenantId: string, threadId: string): Promise<string | null> {
  const [thread] = await db
    .select({ contactId: conversationThreads.contactId })
    .from(conversationThreads)
    .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)))
    .limit(1);
  return thread?.contactId ?? null;
}

/** Records that this contact agreed to receive texts, how, and their timezone. */
export async function PUT(request: Request, { params }: Params) {
  const authResult = await requireTenant(request);
  if (authResult instanceof Response) return authResult;
  const { threadId } = await params;
  if (!isUuid(threadId)) return notFound("Conversation not found");
  const parsed = consentBodySchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error);
  const tenantId = authResult.tenant.tenantId;
  const contactId = await contactOf(tenantId, threadId);
  if (!contactId) return notFound("Conversation not found");
  const saved = await setSmsConsent(db, tenantId, contactId, {
    consent: true,
    source: parsed.data.source,
    timezone: parsed.data.timezone,
    recordedBy: authResult.userId,
  });
  if (!saved) return badRequest("This contact has no phone number");
  return Response.json({ ok: true });
}

/** Marks the contact as opted out: no more texts until they text START or consent again. */
export async function DELETE(request: Request, { params }: Params) {
  const authResult = await requireTenant(request);
  if (authResult instanceof Response) return authResult;
  const { threadId } = await params;
  if (!isUuid(threadId)) return notFound("Conversation not found");
  const tenantId = authResult.tenant.tenantId;
  const contactId = await contactOf(tenantId, threadId);
  if (!contactId) return notFound("Conversation not found");
  await setSmsConsent(db, tenantId, contactId, { consent: false, recordedBy: authResult.userId });
  return Response.json({ ok: true });
}
