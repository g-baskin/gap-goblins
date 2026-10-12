/**
 * Cal.com Webhook Handler
 * POST /api/webhooks/cal
 *
 * Receives booking events from Cal.com and updates the CRM (and, for
 * form-submission contacts, the contact_submissions audit table).
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { dispatchCalWebhookEvent } from "./events";
import {
  buildCalBookingContext,
  parseCalWebhookPayload,
  validateCalWebhookTimestamp,
} from "./parser";
import {
  computeSignature,
  hashBodyForLogging,
  hashEmailForLogging,
  type SignatureDebugInfo,
  verifyWebhookSignature,
} from "./security";
import { type CalWebhookHandlerResult, MAX_BODY_SIZE } from "./types";

function jsonResponse({ body, status }: CalWebhookHandlerResult): NextResponse {
  if (status) {
    return NextResponse.json(body, { status });
  }
  return NextResponse.json(body);
}

/**
 * POST /api/webhooks/cal
 * Handle Cal.com webhook events
 *
 * Note: Rate limiting should be implemented at the edge (Vercel Edge Functions) or middleware level
 * to prevent webhook flooding attacks before they reach this handler.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (before signature verification to prevent DoS on HMAC computation)
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(
      `webhook:cal:${clientIp}`,
      { limit: 100, windowMs: 60 * 1000 },
      "api",
    );

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();

    // Defense-in-depth size validation (body already in memory)
    // Primary protection should be at Vercel Edge level
    if (rawBody.length > MAX_BODY_SIZE) {
      logger.warn("Webhook payload too large", { size: rawBody.length });
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const signature = request.headers.get("x-cal-signature-256");

    // Step 1: Get webhook secret from environment
    const webhookSecret = process.env.CAL_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error("CAL_WEBHOOK_SECRET not configured in environment");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // Compute signature once and reuse for both debug logging and verification
    const computedSignature = computeSignature(rawBody, webhookSecret);

    // Debug logging for signature verification (only when explicitly enabled)
    // Logs are security-conscious: no secret prefixes, body content is hashed
    if (process.env.DEBUG_WEBHOOK_SIGNATURE === "true") {
      if (process.env.NODE_ENV === "production") {
        logger.warn("DEBUG_WEBHOOK_SIGNATURE is enabled in production - disable after debugging");
      }
      const debugInfo: SignatureDebugInfo = {
        hasSignatureHeader: !!signature,
        signatureLength: signature?.length || 0,
        computedLength: computedSignature.length,
        bodyLength: rawBody.length,
        bodyHash: hashBodyForLogging(rawBody),
      };
      logger.debug("Webhook signature debug:", debugInfo);
    }

    if (!verifyWebhookSignature(signature, computedSignature)) {
      logger.error("Invalid webhook signature - verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const parsed = parseCalWebhookPayload(rawBody, request);
    if ("response" in parsed) {
      return jsonResponse(parsed.response);
    }

    const webhookData = parsed.data;

    logger.info("Cal.com webhook received:", {
      event: webhookData.triggerEvent,
      bookingId: webhookData.payload?.uid,
    });

    const timestampError = validateCalWebhookTimestamp(webhookData);
    if (timestampError) {
      return jsonResponse(timestampError);
    }

    const contextResult = buildCalBookingContext(webhookData);
    if ("response" in contextResult) {
      return jsonResponse(contextResult.response);
    }

    const result = await dispatchCalWebhookEvent(contextResult.context);
    return jsonResponse(result);
  } catch (error) {
    logger.error("Webhook processing error:", error);

    return NextResponse.json(
      {
        error: "Webhook processing failed with unexpected error",
        message: error instanceof Error ? error.message : "Unknown error",
        details:
          "Cal.com webhook could not be processed. Cal.com may retry this webhook automatically.",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/webhooks/cal
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Cal.com webhook endpoint is active",
  });
}

// Export internal functions for testing
export const _testing = {
  computeSignature,
  verifyWebhookSignature,
  hashBodyForLogging,
  hashEmailForLogging,
};
