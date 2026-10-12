import { InboundWebhookError, receiveInboundWebhook } from "@/lib/automation/webhooks/inbound";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ hookId: string }> }) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 256 * 1024)
    return Response.json({ error: "Webhook body too large" }, { status: 413 });
  try {
    const { hookId } = await params;
    const result = await receiveInboundWebhook({
      hookId,
      contentType: request.headers.get("content-type"),
      timestamp: request.headers.get("x-automation-timestamp"),
      signature: request.headers.get("x-automation-signature"),
      body: await request.text(),
    });
    return Response.json({ received: true, eventId: result.eventId }, { status: 202 });
  } catch (error) {
    if (error instanceof InboundWebhookError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Webhook unavailable" }, { status: 503 });
  }
}
