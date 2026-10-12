import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";

export function buildAutomationUnsubscribeToken(enrollmentId: string): string {
  const secret = getUnsubscribeSecret();
  const signature = sign(enrollmentId, secret);
  return `${TOKEN_VERSION}.${signature}`;
}

export function verifyAutomationUnsubscribeToken(
  enrollmentId: string,
  token: string | null,
): boolean {
  if (!token) {
    return false;
  }

  const [_version, signature] = token.split(".");
  if (_version !== TOKEN_VERSION || !signature) {
    return false;
  }

  const expected = sign(enrollmentId, getUnsubscribeSecret());
  const actualBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function sign(enrollmentId: string, secret: string): string {
  return createHmac("sha256", secret).update(enrollmentId).digest("base64url");
}

function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "UNSUBSCRIBE_SECRET or AUTH_SECRET is required for automation unsubscribe links",
    );
  }
  return secret;
}
