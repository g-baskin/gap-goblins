import { processTwilioWebhook } from "@/lib/automation/sms/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 64 * 1024) return Response.json({ error: "Request too large" }, { status: 413 });
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded")) {
    return Response.json({ error: "Form content type required" }, { status: 415 });
  }
  const signature = request.headers.get("x-twilio-signature");
  const publicBaseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!signature || !publicBaseUrl)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 64 * 1024) {
      return Response.json({ error: "Request too large" }, { status: 413 });
    }
    const params = Object.fromEntries(new URLSearchParams(body));
    const url = new URL("/api/webhooks/twilio", publicBaseUrl).toString();
    const result = await processTwilioWebhook({ signature, url, params });
    return Response.json({ received: true, duplicate: result.duplicate });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
