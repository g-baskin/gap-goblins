export const WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;
export const CLOCK_SKEW_TOLERANCE_MS = 30 * 1000;
export const SUBMISSION_MATCH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_BODY_SIZE = 1024 * 1024;

export const HANDLED_CAL_EVENTS = [
  "BOOKING_CREATED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
  "BOOKING_ENDED",
] as const;

export type HandledCalEvent = (typeof HANDLED_CAL_EVENTS)[number];

export interface CalMetadata {
  email?: { value: string };
  submission_id?: { value: string };
  [key: string]: unknown;
}

export interface CalWebhookPayload {
  triggerEvent: string;
  createdAt: string;
  payload?: {
    uid: string;
    bookingId: number;
    type: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    attendees?: Array<{
      email: string;
      name: string;
      timeZone: string;
    }>;
    organizer: {
      email: string;
      name: string;
      timeZone: string;
    };
    metadata?: CalMetadata;
  };
}

export interface CalBookingContext {
  webhookData: CalWebhookPayload;
  event: HandledCalEvent;
  bookingId: string;
  attendeeEmail: string;
  startTime: string;
  eventTitle: string;
}

export interface ContactSubmissionRecord {
  id: string;
  email: string;
  firstName: string;
  updatedAt: string;
  calBookingId: string | null;
}

export interface CalWebhookHandlerResult {
  body: Record<string, unknown>;
  status?: number;
}
