import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { hashBodyForLogging } from "./security";
import {
  type CalBookingContext,
  type CalWebhookHandlerResult,
  type CalWebhookPayload,
  CLOCK_SKEW_TOLERANCE_MS,
  HANDLED_CAL_EVENTS,
  type HandledCalEvent,
  WEBHOOK_MAX_AGE_MS,
} from "./types";

export function normalizeCalEvent(event: string | undefined): string {
  return event?.toUpperCase() || "";
}

export function isHandledCalEvent(event: string): event is HandledCalEvent {
  return HANDLED_CAL_EVENTS.includes(event as HandledCalEvent);
}

export function parseCalWebhookPayload(
  rawBody: string,
  request: NextRequest,
): { data: CalWebhookPayload } | { response: CalWebhookHandlerResult } {
  try {
    return { data: JSON.parse(rawBody) as CalWebhookPayload };
  } catch {
    logger.error("Invalid JSON in webhook payload", {
      bodyLength: rawBody.length,
      bodyHash: hashBodyForLogging(rawBody),
      contentType: request.headers.get("content-type"),
    });
    return { response: { body: { error: "Invalid JSON payload" }, status: 400 } };
  }
}

export function validateCalWebhookTimestamp(
  webhookData: CalWebhookPayload,
  nowMs = Date.now(),
): CalWebhookHandlerResult | null {
  const createdAtDate = new Date(webhookData.createdAt);
  if (Number.isNaN(createdAtDate.getTime())) {
    logger.error("Invalid createdAt timestamp in webhook");
    return { body: { error: "Invalid webhook timestamp" }, status: 400 };
  }

  const webhookAge = nowMs - createdAtDate.getTime();

  if (webhookAge > WEBHOOK_MAX_AGE_MS) {
    logger.warn("Webhook too old, possible replay attack", {
      createdAt: webhookData.createdAt,
      ageMinutes: Math.floor(webhookAge / 60000),
    });
    return { body: { error: "Webhook timestamp too old" }, status: 400 };
  }

  if (webhookAge < -CLOCK_SKEW_TOLERANCE_MS) {
    logger.warn("Webhook timestamp too far in the future", {
      createdAt: webhookData.createdAt,
      skewMs: Math.abs(webhookAge),
    });
    return { body: { error: "Invalid webhook timestamp" }, status: 400 };
  }

  return null;
}

export function buildCalBookingContext(
  webhookData: CalWebhookPayload,
): { context: CalBookingContext } | { response: CalWebhookHandlerResult } {
  const normalizedEvent = normalizeCalEvent(webhookData.triggerEvent);

  if (!isHandledCalEvent(normalizedEvent)) {
    return {
      response: {
        body: {
          message: "Event type not handled",
          event: webhookData.triggerEvent,
        },
      },
    };
  }

  if (!webhookData.payload) {
    logger.error("Missing payload in webhook data");
    return {
      response: { body: { error: "Invalid webhook data: missing payload" }, status: 400 },
    };
  }

  const bookingId = webhookData.payload.uid;
  const attendees = webhookData.payload.attendees || [];
  const startTime = webhookData.payload.startTime;
  const eventTitle = webhookData.payload.title;
  const metadata = webhookData.payload.metadata;

  let attendeeEmail: string | null = null;

  if (metadata?.email?.value) {
    attendeeEmail = metadata.email.value;
  }

  if (!attendeeEmail && attendees.length > 0) {
    attendeeEmail = attendees[0]?.email ?? null;
  }

  if (!attendeeEmail) {
    logger.error("No email found in webhook payload", {
      hasMetadata: !!metadata,
      hasMetadataEmail: !!metadata?.email,
      hasAttendees: !!attendees,
      attendeesLength: attendees.length,
    });
    return { response: { body: { error: "No email found in booking" }, status: 400 } };
  }

  return {
    context: {
      webhookData,
      event: normalizedEvent,
      bookingId,
      attendeeEmail: attendeeEmail.toLowerCase().trim(),
      startTime,
      eventTitle,
    },
  };
}
