import { z } from "zod";
import { rollbackWorkflowRevision } from "@/lib/automation/graph/revisions";
import { parseJson, requireAutomationTenant, validationError } from "../../../_lib";

const schema = z.object({ revisionId: z.uuid() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const auth = await requireAutomationTenant(request, true);
  if (auth instanceof Response) return auth;
  const body = await parseJson(request);
  if (body instanceof Response) return body;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(z.flattenError(parsed.error));
  const { flowId } = await params;
  return Response.json({
    revision: await rollbackWorkflowRevision({
      tenantId: auth.tenant.tenantId,
      flowId,
      revisionId: parsed.data.revisionId,
      userId: auth.userId,
    }),
  });
}
