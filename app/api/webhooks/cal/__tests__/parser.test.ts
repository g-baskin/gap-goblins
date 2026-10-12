import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  buildCalBookingContext,
  parseCalWebhookPayload,
  validateCalWebhookTimestamp,
} from "../parser";
import type { CalWebhookPayload } from "../types";

function createPayload(overrides: Partial<CalWebhookPayload> = {}): CalWebhookPayload {
  return {
    triggerEvent: "BOOKING_CREATED",
    createdAt: new Date().toISOString(),
    payload: {
      uid: "booking-123",
      bookingId: 123,
      type: "consultation",
      title: "Consultation",
      description: "",
      startTime: new Date(Date.now() + 86_400_000).toISOString(),
      endTime: new Date(Date.now() + 90_000_000).toISOString(),
      attendees: [{ email: "Lead@Example.com", name: "Lead", timeZone: "Australia/Sydney" }],
      organizer: { email: "owner@example.com", name: "Owner", timeZone: "Australia/Sydney" },
      metadata: {},
    },
    ...overrides,
  };
}

function createRequest(body: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/webhooks/cal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("Cal.com webhook parser", () => {
  it("parses valid JSON payloads", () => {
    const payload = createPayload();
    const parsed = parseCalWebhookPayload(
      JSON.stringify(payload),
      createRequest(JSON.stringify(payload)),
    );

    expect("data" in parsed).toBe(true);
    if ("data" in parsed) {
      expect(parsed.data.triggerEvent).toBe("BOOKING_CREATED");
    }
  });

  it("returns the existing 400 body for malformed JSON", () => {
    const parsed = parseCalWebhookPayload("{ invalid", createRequest("{ invalid"));

    expect("response" in parsed).toBe(true);
    if ("response" in parsed) {
      expect(parsed.response.status).toBe(400);
      expect(parsed.response.body).toEqual({ error: "Invalid JSON payload" });
    }
  });

  it("returns the ignored-event response before booking extraction", () => {
    const context = buildCalBookingContext(createPayload({ triggerEvent: "BOOKING_UNKNOWN" }));

    expect("response" in context).toBe(true);
    if ("response" in context) {
      expect(context.response.status).toBeUndefined();
      expect(context.response.body).toEqual({
        message: "Event type not handled",
        event: "BOOKING_UNKNOWN",
      });
    }
  });

  it("normalizes handled events and attendee emails", () => {
    const context = buildCalBookingContext(createPayload({ triggerEvent: "booking_created" }));

    expect("context" in context).toBe(true);
    if ("context" in context) {
      expect(context.context.event).toBe("BOOKING_CREATED");
      expect(context.context.attendeeEmail).toBe("lead@example.com");
      expect(context.context.bookingId).toBe("booking-123");
    }
  });

  it("rejects missing booking email with the existing 400 body", () => {
    const context = buildCalBookingContext(
      createPayload({
        payload: {
          ...createPayload().payload!,
          attendees: [],
          metadata: {},
        },
      }),
    );

    expect("response" in context).toBe(true);
    if ("response" in context) {
      expect(context.response.status).toBe(400);
      expect(context.response.body).toEqual({ error: "No email found in booking" });
    }
  });

  it("keeps timestamp replay protection in the parser layer", () => {
    const stale = createPayload({ createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() });

    expect(validateCalWebhookTimestamp(stale)?.body).toEqual({
      error: "Webhook timestamp too old",
    });
  });
});
