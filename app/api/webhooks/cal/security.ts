import crypto from "node:crypto";
import { logger } from "@/lib/logger";

const HEX_SHA256_REGEX = /^[a-f0-9]{64}$/;

export interface SignatureDebugInfo {
  hasSignatureHeader: boolean;
  signatureLength: number;
  computedLength: number;
  bodyLength: number;
  bodyHash: string;
}

export function hashEmailForLogging(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").substring(0, 8);
}

export function hashBodyForLogging(body: string): string {
  return crypto.createHash("sha256").update(body).digest("hex").substring(0, 16);
}

export function computeSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(
  signature: string | null | undefined,
  computedSignature: string,
): boolean {
  if (!signature) return false;

  let actualHash: string;
  if (signature.startsWith("sha256=")) {
    actualHash = signature.substring(7);
  } else {
    if (process.env.DEBUG_WEBHOOK_SIGNATURE === "true") {
      logger.debug("Webhook signature: using raw hash format");
    }
    actualHash = signature;
  }

  if (!HEX_SHA256_REGEX.test(actualHash)) {
    logger.warn("Invalid signature format: not a valid SHA-256 hex string", {
      actualLength: actualHash.length,
      expectedLength: 64,
    });
    return false;
  }

  if (actualHash.length !== computedSignature.length) return false;

  return crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(computedSignature));
}
