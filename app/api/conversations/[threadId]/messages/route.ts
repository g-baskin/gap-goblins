import { z } from "zod";
import { db } from "@/lib/db";
import { SMS_MAX_LENGTH, sendInboxSms } from "@/lib/messaging/send";
import { checkRateLimit } from "@/lib/rate-limit";
import { badRequest, isUuid, notFound, readJson, requireTenant } from "../../_lib";

type Params = { params: Promise<{ threadId: string }> };

const sendSchema = z.object({
  body: z.string().max(SMS_MAX_LENGTH, `Texts can be at most ${SMS_MAX_LENGTH} characters`),
  idempotencyKey: z.uuid("Missing message id"),
});

export async function POST(request: Request, { params }: Params) {
  const authResult = await requireTenant(request);
  if (authResult instanceof Response) return authResult;
  const { threadId } = await params;
  if (!isUuid(threadId)) return notFound("Conversation not found");
  const limited = await checkRateLimit(
    `inbox-sms:${authResult.userId}`,
    { limit: 60, windowMs: 60_000 },
    "api",
  );
  if (!limited.success) {
    return Response.json({ error: "Too many messages. Wait a minute." }, { status: 429 });
  }
  const parsed = sendSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error);
  const result = await sendInboxSms(db, {
    tenantId: authResult.tenant.tenantId,
    threadId,
    userId: authResult.userId,
    body: parsed.data.body,
    idempotencyKey: parsed.data.idempotencyKey,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(
    { messageId: result.messageId, status: result.status },
    { status: result.duplicate ? 200 : 201 },
  );
}
