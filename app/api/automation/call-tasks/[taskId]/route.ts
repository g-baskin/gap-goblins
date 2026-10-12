import { z } from "zod";
import { completeCallTask } from "@/lib/automation/actions/call-task";
import { parseJson, requireAutomationTenant, validationError } from "../../_lib";

const schema = z
  .object({ outcome: z.string().trim().min(1).max(500), notes: z.string().max(10_000).optional() })
  .strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const auth = await requireAutomationTenant(request);
  if (auth instanceof Response) return auth;
  const body = await parseJson(request);
  if (body instanceof Response) return body;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(z.flattenError(parsed.error));
  const { taskId } = await params;
  return Response.json({
    task: await completeCallTask({
      tenantId: auth.tenant.tenantId,
      taskId,
      actorId: auth.userId,
      ...parsed.data,
    }),
  });
}
