import type { NextRequest } from "next/server";
import { enrollContactInFlow, enrollSubscriberInFlow } from "@/lib/automation/enrollments";
import { logger } from "@/lib/logger";
import { manualEnrollmentSchema } from "@/lib/validations/automation";
import { parseJson, requireAutomationTenant, validationError } from "../../../_lib";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const authResult = await requireAutomationTenant(request, true);
  if (authResult instanceof Response) return authResult;

  const body = await parseJson(request);
  if (body instanceof Response) return body;

  const parsed = manualEnrollmentSchema.safeParse(body.data);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  try {
    const { flowId } = await params;
    const enrollment = parsed.data.subscriberId
      ? await enrollSubscriberInFlow(flowId, parsed.data.subscriberId, authResult.tenant.tenantId)
      : parsed.data.contactId
        ? await enrollContactInFlow(flowId, parsed.data.contactId, authResult.tenant.tenantId)
        : null;

    if (!enrollment) {
      return Response.json({ error: "Enrollment could not be created" }, { status: 400 });
    }

    return Response.json({ enrollment }, { status: 201 });
  } catch (error) {
    logger.error("Error manually enrolling automation contact:", error);
    return Response.json({ error: "Failed to enroll contact" }, { status: 500 });
  }
}
