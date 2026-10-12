import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactSubmissions } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { runCrmBookingSync, runCrmCancelSync, runCrmRescheduleSync } from "./crm-sync";
import { hashEmailForLogging } from "./security";
import {
  type CalBookingContext,
  type CalWebhookHandlerResult,
  type ContactSubmissionRecord,
  SUBMISSION_MATCH_WINDOW_MS,
} from "./types";

function noMatchingRecordResponse(attendeeEmail: string): CalWebhookHandlerResult {
  return {
    body: {
      message: "No matching record found",
      emailHash: hashEmailForLogging(attendeeEmail),
    },
  };
}

async function findExistingSubmission(
  context: CalBookingContext,
): Promise<
  { submission: ContactSubmissionRecord | undefined } | { response: CalWebhookHandlerResult }
> {
  const { attendeeEmail, bookingId, event } = context;
  const cutoffDate = new Date(Date.now() - SUBMISSION_MATCH_WINDOW_MS).toISOString();

  try {
    if (event === "BOOKING_RESCHEDULED" || event === "BOOKING_CANCELLED") {
      const [row] = await db
        .select({
          id: contactSubmissions.id,
          email: contactSubmissions.email,
          firstName: contactSubmissions.firstName,
          updatedAt: contactSubmissions.updatedAt,
          calBookingId: contactSubmissions.calBookingId,
        })
        .from(contactSubmissions)
        .where(eq(contactSubmissions.calBookingId, bookingId))
        .orderBy(desc(contactSubmissions.createdAt))
        .limit(1);
      return { submission: row };
    }

    const [row] = await db
      .select({
        id: contactSubmissions.id,
        email: contactSubmissions.email,
        firstName: contactSubmissions.firstName,
        updatedAt: contactSubmissions.updatedAt,
        calBookingId: contactSubmissions.calBookingId,
      })
      .from(contactSubmissions)
      .where(
        and(
          eq(contactSubmissions.email, attendeeEmail),
          gte(contactSubmissions.createdAt, cutoffDate),
        ),
      )
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(1);
    return { submission: row };
  } catch (fetchError) {
    logger.error("Database error while fetching contact submission:", {
      message: fetchError instanceof Error ? fetchError.message : String(fetchError),
      emailHash: hashEmailForLogging(attendeeEmail),
    });
    return {
      response: { body: { error: "Database error while fetching submission" }, status: 500 },
    };
  }
}

async function getSubmissionOrResponse(
  context: CalBookingContext,
): Promise<
  { submission: ContactSubmissionRecord | undefined } | { response: CalWebhookHandlerResult }
> {
  const result = await findExistingSubmission(context);
  if ("response" in result) return result;

  if (!result.submission) {
    logger.info("No contact submission — outreach-sourced or unknown contact path", {
      emailHash: hashEmailForLogging(context.attendeeEmail),
      event: context.event,
    });
  }

  return result;
}

export async function handleBookingEnded(
  context: CalBookingContext,
): Promise<CalWebhookHandlerResult> {
  logger.info("Meeting ended for:", hashEmailForLogging(context.attendeeEmail));
  return {
    body: {
      success: true,
      message: "Meeting ended event logged",
    },
  };
}

export async function handleBookingCancelled(
  context: CalBookingContext,
): Promise<CalWebhookHandlerResult> {
  const { attendeeEmail, bookingId } = context;
  const lookup = await getSubmissionOrResponse(context);
  if ("response" in lookup) return lookup.response;

  const existingSubmission = lookup.submission;

  if (existingSubmission) {
    try {
      const updatedData = await db
        .update(contactSubmissions)
        .set({
          calBookingId: null,
          bookingDateTime: null,
        })
        .where(eq(contactSubmissions.id, existingSubmission.id))
        .returning({ id: contactSubmissions.id });

      if (updatedData.length === 0) {
        logger.warn("No rows updated for cancellation", {
          submissionId: existingSubmission.id,
          emailHash: hashEmailForLogging(attendeeEmail),
        });
      } else {
        logger.info("Successfully cleared booking for cancellation:", {
          id: existingSubmission.id,
          emailHash: hashEmailForLogging(attendeeEmail),
          bookingId,
        });
      }
    } catch (updateError) {
      logger.error("Failed to clear booking for cancellation:", updateError);
      return {
        body: {
          error: "Failed to update contact submission for cancellation",
          message: updateError instanceof Error ? updateError.message : String(updateError),
          details:
            "Database update failed when processing booking cancellation. Cal.com may retry this webhook.",
        },
        status: 500,
      };
    }
  }

  const { contactFound } = await runCrmCancelSync(attendeeEmail, bookingId);

  if (!existingSubmission && !contactFound) {
    return noMatchingRecordResponse(attendeeEmail);
  }

  return {
    body: {
      success: true,
      message: "Booking cancelled",
      submissionId: existingSubmission?.id,
    },
  };
}

export async function handleBookingCreated(
  context: CalBookingContext,
): Promise<CalWebhookHandlerResult> {
  const { attendeeEmail, bookingId, startTime, eventTitle } = context;
  const lookup = await getSubmissionOrResponse(context);
  if ("response" in lookup) return lookup.response;

  const existingSubmission = lookup.submission;

  if (existingSubmission) {
    if (existingSubmission.calBookingId === bookingId) {
      logger.info("Booking already processed (idempotent):", {
        bookingId,
        existingSubmissionId: existingSubmission.id,
      });
      return {
        body: {
          success: true,
          message: "Booking already processed",
          submissionId: existingSubmission.id,
        },
      };
    }

    if (existingSubmission.calBookingId) {
      logger.warn("Submission already has a different booking", {
        submissionId: existingSubmission.id,
        existingBookingId: existingSubmission.calBookingId,
        newBookingId: bookingId,
        emailHash: hashEmailForLogging(attendeeEmail),
      });
      return {
        body: {
          success: true,
          message: "Submission already has a booking",
        },
      };
    }

    try {
      const updatedData = await db
        .update(contactSubmissions)
        .set({
          calBookingId: bookingId,
          bookingDateTime: startTime,
        })
        .where(
          and(
            eq(contactSubmissions.id, existingSubmission.id),
            isNull(contactSubmissions.calBookingId),
          ),
        )
        .returning({
          id: contactSubmissions.id,
          calBookingId: contactSubmissions.calBookingId,
        });

      if (updatedData.length === 0) {
        const [checkBooking] = await db
          .select({ id: contactSubmissions.id, calBookingId: contactSubmissions.calBookingId })
          .from(contactSubmissions)
          .where(eq(contactSubmissions.calBookingId, bookingId))
          .limit(1);

        if (checkBooking) {
          logger.info("Booking already processed (race resolved):", {
            bookingId,
            existingSubmissionId: checkBooking.id,
          });
          return {
            body: {
              success: true,
              message: "Booking already processed",
              submissionId: checkBooking.id,
            },
          };
        }

        logger.warn("No rows updated - submission may have another booking or was deleted", {
          submissionId: existingSubmission.id,
          emailHash: hashEmailForLogging(attendeeEmail),
        });
        return {
          body: {
            success: true,
            message: "Submission not found or already has a booking",
          },
        };
      }

      logger.info("Successfully updated contact submission:", {
        id: existingSubmission.id,
        emailHash: hashEmailForLogging(attendeeEmail),
        bookingId,
      });
    } catch (updateError) {
      const errMsg = updateError instanceof Error ? updateError.message : String(updateError);
      if (errMsg.includes("23505") || errMsg.includes("unique")) {
        const [checkBooking] = await db
          .select({ id: contactSubmissions.id })
          .from(contactSubmissions)
          .where(eq(contactSubmissions.calBookingId, bookingId))
          .limit(1);

        if (checkBooking) {
          logger.info("Booking already processed elsewhere (idempotent):", {
            bookingId,
            existingSubmissionId: checkBooking.id,
          });
          return {
            body: {
              success: true,
              message: "Booking already processed",
              submissionId: checkBooking.id,
            },
          };
        }
      }

      logger.error("Failed to update contact submission:", updateError);
      return {
        body: {
          error: "Failed to update contact submission with booking details",
          message: errMsg,
          details:
            "Database update failed when processing new booking. Cal.com may retry this webhook.",
        },
        status: 500,
      };
    }
  }

  const { contactFound } = await runCrmBookingSync(attendeeEmail, bookingId, startTime, eventTitle);

  if (!existingSubmission && !contactFound) {
    return noMatchingRecordResponse(attendeeEmail);
  }

  return {
    body: {
      success: true,
      message: "Booking recorded",
      submissionId: existingSubmission?.id,
    },
  };
}

export async function handleBookingRescheduled(
  context: CalBookingContext,
): Promise<CalWebhookHandlerResult> {
  const { attendeeEmail, bookingId, startTime } = context;
  const lookup = await getSubmissionOrResponse(context);
  if ("response" in lookup) return lookup.response;

  const existingSubmission = lookup.submission;

  if (existingSubmission) {
    try {
      const updatedData = await db
        .update(contactSubmissions)
        .set({
          calBookingId: bookingId,
          bookingDateTime: startTime,
        })
        .where(eq(contactSubmissions.id, existingSubmission.id))
        .returning({ id: contactSubmissions.id });

      if (updatedData.length === 0) {
        logger.warn("No rows updated - submission may have been deleted", {
          submissionId: existingSubmission.id,
          emailHash: hashEmailForLogging(attendeeEmail),
        });
      } else {
        logger.info("Successfully rescheduled booking:", {
          id: existingSubmission.id,
          emailHash: hashEmailForLogging(attendeeEmail),
          bookingId,
        });
      }
    } catch (updateError) {
      logger.error("Failed to update contact submission:", updateError);
      return {
        body: {
          error: "Failed to update contact submission with rescheduled booking",
          message: updateError instanceof Error ? updateError.message : String(updateError),
          details:
            "Database update failed when processing rescheduled booking. Cal.com may retry this webhook.",
        },
        status: 500,
      };
    }
  }

  const { contactFound } = await runCrmRescheduleSync(attendeeEmail, bookingId, startTime);

  if (!existingSubmission && !contactFound) {
    return noMatchingRecordResponse(attendeeEmail);
  }

  return {
    body: {
      success: true,
      message: "Booking rescheduled",
      submissionId: existingSubmission?.id,
    },
  };
}
