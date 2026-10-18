import { z } from "zod";
import { db } from "@/lib/db";
import { getThread, updateThread } from "@/lib/messaging/inbox";
import { badRequest, isUuid, notFound, readJson, requireTenant } from "../_lib";

type Params = { params: Promise<{ threadId: string }> };

export async function GET(request: Request, { params }: Params) {
  const authResult = await requireTenant(request);
  if (authResult instanceof Response) return authResult;
  const { threadId } = await params;
  if (!isUuid(threadId)) return notFound("Conversation not found");
  const thread = await getThread(db, authResult.tenant.tenantId, threadId);
  if (!thread) return notFound("Conversation not found");
  return Response.json({ thread });
}

const patchSchema = z
  .object({ starred: z.boolean().optional(), read: z.literal(true).optional() })
  .refine((value) => value.starred !== undefined || value.read, "Nothing to update");

export async function PATCH(request: Request, { params }: Params) {
  const authResult = await requireTenant(request);
  if (authResult instanceof Response) return authResult;
  const { threadId } = await params;
  if (!isUuid(threadId)) return notFound("Conversation not found");
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error);
  const updated = await updateThread(db, authResult.tenant.tenantId, threadId, parsed.data);
  if (!updated) return notFound("Conversation not found");
  return Response.json({ ok: true });
}
