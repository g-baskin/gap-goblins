import {
  handleBookingCancelled,
  handleBookingCreated,
  handleBookingEnded,
  handleBookingRescheduled,
} from "./handlers";
import type { CalBookingContext, CalWebhookHandlerResult, HandledCalEvent } from "./types";

type CalEventHandler = (context: CalBookingContext) => Promise<CalWebhookHandlerResult>;

const EVENT_DISPATCH: Record<HandledCalEvent, CalEventHandler> = {
  BOOKING_CREATED: handleBookingCreated,
  BOOKING_RESCHEDULED: handleBookingRescheduled,
  BOOKING_CANCELLED: handleBookingCancelled,
  BOOKING_ENDED: handleBookingEnded,
};

export function dispatchCalWebhookEvent(
  context: CalBookingContext,
): Promise<CalWebhookHandlerResult> {
  return EVENT_DISPATCH[context.event](context);
}
