import { z } from "zod";
import { GraphCompileError } from "@/lib/automation/graph/compiler";
import { publishWorkflow, RevisionConflictError } from "@/lib/automation/graph/revisions";
import { parseJson, requireAutomationTenant, validationError } from "../../../_lib";

const schema = z.object({ optimisticToken: z.uuid() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const auth = await requireAutomationTenant(request, true);
  if (auth instanceof Response) return auth;
  const body = await parseJson(request);
  if (body instanceof Response) return body;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return validationError(z.flattenError(parsed.error));
  try {
    const { flowId } = await params;
    return Response.json({
      revision: await publishWorkflow({
        tenantId: auth.tenant.tenantId,
        flowId,
        userId: auth.userId,
        optimisticToken: parsed.data.optimisticToken,
      }),
    });
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      return Response.json({ error: error.message, code: "DRAFT_CONFLICT" }, { status: 409 });
    }
    if (error instanceof GraphCompileError) {
      return Response.json({ error: error.message, issues: error.issues }, { status: 400 });
    }
    throw error;
  }
}
