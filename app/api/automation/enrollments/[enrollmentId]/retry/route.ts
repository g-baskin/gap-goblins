import { z } from "zod";
import { retryEnrollmentNode } from "@/lib/automation/graph/recovery";
import { parseJson, requireAutomationTenant, validationError } from "../../../_lib";

const schema = z.object({ reason: z.string().trim().min(1).max(1000) }).strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  const auth = await requireAutomationTenant(request, true);
  if (auth instanceof Response) return auth;
  const body = await parseJson(request);
  if (body instanceof Response) return body;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(z.flattenError(parsed.error));
  const { enrollmentId } = await params;
  return Response.json({
    recovery: await retryEnrollmentNode({
      tenantId: auth.tenant.tenantId,
      enrollmentId,
      actorId: auth.userId,
      reason: parsed.data.reason,
    }),
  });
}
