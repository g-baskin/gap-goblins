import { z } from "zod";
import {
  listWorkflowRevisions,
  loadWorkflowDraft,
  RevisionConflictError,
  saveWorkflowDraft,
} from "@/lib/automation/graph/revisions";
import { saveAutomationGraphSchema } from "@/lib/validations/automation-graph";
import { parseJson, requireAutomationTenant, validationError } from "../../../_lib";

export async function GET(request: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const auth = await requireAutomationTenant(request);
  if (auth instanceof Response) return auth;
  const { flowId } = await params;
  const draft = await loadWorkflowDraft(auth.tenant.tenantId, flowId);
  return draft
    ? Response.json({
        draft,
        revisions: await listWorkflowRevisions(auth.tenant.tenantId, flowId),
      })
    : Response.json({ error: "Draft not found" }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const auth = await requireAutomationTenant(request, true);
  if (auth instanceof Response) return auth;
  const body = await parseJson(request);
  if (body instanceof Response) return body;
  const parsed = saveAutomationGraphSchema.safeParse(body.data);
  if (!parsed.success) return validationError(z.flattenError(parsed.error));
  try {
    const { flowId } = await params;
    const draft = await saveWorkflowDraft({
      tenantId: auth.tenant.tenantId,
      flowId,
      userId: auth.userId,
      graph: parsed.data.graph,
      optimisticToken: parsed.data.optimisticToken,
    });
    return Response.json({
      draft,
      revisions: await listWorkflowRevisions(auth.tenant.tenantId, flowId),
    });
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      return Response.json({ error: error.message, code: "DRAFT_CONFLICT" }, { status: 409 });
    }
    throw error;
  }
}
