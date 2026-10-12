import { z } from "zod";
import { applyWorkflowTemplate } from "@/lib/automation/graph/templates";
import { parseJson, requireAutomationTenant, validationError } from "../../../_lib";

const schema = z.object({ flowId: z.uuid() }).strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const auth = await requireAutomationTenant(request, true);
  if (auth instanceof Response) return auth;
  const body = await parseJson(request);
  if (body instanceof Response) return body;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(z.flattenError(parsed.error));
  const { templateId } = await params;
  return Response.json({
    draft: await applyWorkflowTemplate({
      tenantId: auth.tenant.tenantId,
      flowId: parsed.data.flowId,
      templateId,
      userId: auth.userId,
    }),
  });
}
