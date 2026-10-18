import { z } from "zod";
import { readJson, requireTenant } from "@/app/api/conversations/_lib";
import { db } from "@/lib/db";
import { normalizeSmsPhone } from "@/lib/messaging/inbox";
import {
  connectTwilio,
  disconnectTwilio,
  getTwilioConnection,
} from "@/lib/messaging/twilio-account";
import { checkRateLimit } from "@/lib/rate-limit";

function webhookUrl(request: Request): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return new URL("/api/webhooks/twilio", base).toString();
}

export async function GET(request: Request) {
  const authResult = await requireTenant(request);
  if (authResult instanceof Response) return authResult;
  const connection = await getTwilioConnection(db, authResult.tenant.tenantId);
  const url = webhookUrl(request);
  return Response.json({
    connection,
    webhookUrl: url,
    webhookReachable: url.startsWith("https://"),
  });
}

const connectSchema = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[0-9a-fA-F]{32}$/, "Account SID starts with AC followed by 32 characters"),
  authToken: z.string().trim().min(16, "Paste the Auth Token from the Twilio console").max(128),
  phoneNumber: z.string().trim().min(1, "Enter your Twilio phone number").max(32),
});

export async function PUT(request: Request) {
  const authResult = await requireTenant(request, true);
  if (authResult instanceof Response) return authResult;
  const limited = await checkRateLimit(
    `twilio-connect:${authResult.userId}`,
    { limit: 10, windowMs: 60_000 },
    "api",
  );
  if (!limited.success) {
    return Response.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }
  const parsed = connectSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 },
    );
  }
  const phoneNumber = normalizeSmsPhone(parsed.data.phoneNumber);
  if (!phoneNumber) {
    return Response.json({ error: "Enter a valid US phone number" }, { status: 400 });
  }
  const result = await connectTwilio(db, authResult.tenant.tenantId, {
    accountSid: parsed.data.accountSid,
    authToken: parsed.data.authToken,
    phoneNumber,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ connection: result.connection });
}

export async function DELETE(request: Request) {
  const authResult = await requireTenant(request, true);
  if (authResult instanceof Response) return authResult;
  await disconnectTwilio(db, authResult.tenant.tenantId);
  return Response.json({ ok: true });
}
