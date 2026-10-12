import { z } from "zod";
import { db } from "@/lib/db";
import {
  findOrCreateContactByPhone,
  findOrCreateOpenThread,
  listThreads,
  normalizeSmsPhone,
} from "@/lib/messaging/inbox";
import { getTwilioConnection } from "@/lib/messaging/twilio-account";
import { badRequest, readJson, requireTenant } from "./_lib";

const filterSchema = z.enum(["all", "unread", "recent", "starred"]).catch("all");

export async function GET(request: Request) {
  const authResult = await requireTenant(request);
  if (authResult instanceof Response) return authResult;
  const tenantId = authResult.tenant.tenantId;
  const params = new URL(request.url).searchParams;
  const [threads, unread, connection] = await Promise.all([
    listThreads(db, tenantId, {
      filter: filterSchema.parse(params.get("filter") ?? "all"),
      query: params.get("q") ?? undefined,
    }),
    listThreads(db, tenantId, { filter: "unread" }),
    getTwilioConnection(db, tenantId),
  ]);
  return Response.json({
    threads,
    unreadTotal: unread.reduce((sum, thread) => sum + thread.unreadCount, 0),
    sms: connection
      ? { connected: true, phoneNumber: connection.phoneNumber }
      : { connected: false },
  });
}

const startSchema = z.object({
  phone: z.string().min(1, "Enter a phone number").max(32),
  name: z.string().trim().max(120).optional(),
});

/** Starts (or reopens) an SMS conversation with a phone number. Sends nothing. */
export async function POST(request: Request) {
  const authResult = await requireTenant(request);
  if (authResult instanceof Response) return authResult;
  const tenantId = authResult.tenant.tenantId;
  const parsed = startSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error);
  const phone = normalizeSmsPhone(parsed.data.phone);
  if (!phone) return badRequest("Enter a valid US phone number");
  const contact = await findOrCreateContactByPhone(db, tenantId, phone, {
    displayName: parsed.data.name,
    provenance: "entered_by_team",
    verified: false,
  });
  const threadId = await findOrCreateOpenThread(db, tenantId, contact.contactId, "sms");
  return Response.json({ threadId }, { status: contact.created ? 201 : 200 });
}
