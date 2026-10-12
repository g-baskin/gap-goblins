import { and, eq, sql } from "drizzle-orm";
import {
  enrollContactForDealStageChange,
  enrollContactForStatusChange,
  enrollContactForTrigger,
} from "@/lib/automation/triggers";
import { writeTimelineEvent } from "@/lib/crm/timeline";
import { db } from "@/lib/db";
import { contacts, deals, stages } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { hashEmailForLogging } from "./security";

interface BookingSyncResult {
  contact_updated: boolean;
  deal_id: string | null;
  deal_updated: boolean;
  history_created: boolean;
}

export async function runCrmBookingSync(
  attendeeEmail: string,
  bookingId: string,
  startTime: string,
  eventTitle: string,
): Promise<{ contactFound: boolean; contactId: string | null }> {
  try {
    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.email, attendeeEmail))
      .limit(1);

    if (!contact) {
      logger.warn("Contact not found for booking CRM sync:", hashEmailForLogging(attendeeEmail));
      return { contactFound: false, contactId: null };
    }

    const now = new Date().toISOString();

    const [meetingStage] = await db
      .select({ id: stages.id, slug: stages.slug })
      .from(stages)
      .where(eq(stages.slug, "meeting-booked"))
      .limit(1);

    if (!meetingStage) {
      logger.error("Meeting Booked stage not found in database");
      return { contactFound: true, contactId: contact.id };
    }

    const syncRows = await db.execute(sql`
      SELECT * FROM update_contact_and_deal_for_booking(
        ${contact.id}::uuid,
        ${meetingStage.id}::uuid,
        ${bookingId}::text,
        ${now}::timestamptz
      )
    `);

    const result = (syncRows as unknown as Array<unknown>)[0] as BookingSyncResult | undefined;

    if (result) {
      logger.info("CRM sync completed:", {
        contactId: contact.id,
        contactUpdated: result.contact_updated,
        dealId: result.deal_id,
        dealUpdated: result.deal_updated,
        historyCreated: result.history_created,
      });

      if (result.deal_id) {
        try {
          await db
            .update(deals)
            .set({ meetingBookedAt: startTime })
            .where(eq(deals.id, result.deal_id));
        } catch (meetingError) {
          logger.error("Failed to set meeting_booked_at on deal:", {
            dealId: result.deal_id,
            error: meetingError instanceof Error ? meetingError.message : String(meetingError),
          });
        }
      }

      const bookingDate = new Date(startTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      void writeTimelineEvent({
        contactId: contact.id,
        eventType: "booking_created",
        title: `Meeting booked for ${bookingDate}`,
        metadata: {
          booking_id: bookingId,
          booking_time: startTime,
          event_type: eventTitle,
        },
      });

      if (result.contact_updated) {
        void enrollContactForStatusChange({ contactId: contact.id, status: "qualified" });
      }

      if (result.deal_updated && result.deal_id) {
        void enrollContactForDealStageChange({
          contactId: contact.id,
          stageId: meetingStage.id,
          stageSlug: meetingStage.slug,
        });

        void writeTimelineEvent({
          contactId: contact.id,
          eventType: "stage_changed",
          title: "Deal moved to Meeting Booked",
          metadata: {
            deal_id: result.deal_id,
            to_stage: "Meeting Booked",
            automated: true,
          },
          stageId: meetingStage.id,
        });
      }
    }

    void enrollContactForTrigger("booking_created", contact.id);

    return { contactFound: true, contactId: contact.id };
  } catch (crmError) {
    logger.error("CRM sync error during booking:", crmError);
    return { contactFound: true, contactId: null };
  }
}

export async function runCrmRescheduleSync(
  attendeeEmail: string,
  bookingId: string,
  newStartTime: string,
): Promise<{ contactFound: boolean }> {
  try {
    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.email, attendeeEmail))
      .limit(1);

    if (!contact) {
      logger.warn("Contact not found for reschedule CRM sync:", hashEmailForLogging(attendeeEmail));
      return { contactFound: false };
    }

    try {
      await db
        .update(deals)
        .set({ meetingBookedAt: newStartTime })
        .where(and(eq(deals.contactId, contact.id), eq(deals.status, "open")));
    } catch (updateError) {
      logger.error("Failed to update meeting_booked_at for reschedule:", {
        contactId: contact.id,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      });
    }

    const rescheduleDate = new Date(newStartTime).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    await writeTimelineEvent({
      contactId: contact.id,
      eventType: "booking_rescheduled",
      title: `Meeting rescheduled to ${rescheduleDate}`,
      metadata: {
        booking_id: bookingId,
        booking_time: newStartTime,
      },
    });

    return { contactFound: true };
  } catch (crmError) {
    logger.error("CRM sync error during reschedule:", crmError);
    return { contactFound: true };
  }
}

export async function runCrmCancelSync(
  attendeeEmail: string,
  bookingId: string,
): Promise<{ contactFound: boolean }> {
  try {
    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.email, attendeeEmail))
      .limit(1);

    if (!contact) {
      logger.warn(
        "Contact not found for cancellation CRM sync:",
        hashEmailForLogging(attendeeEmail),
      );
      return { contactFound: false };
    }

    await writeTimelineEvent({
      contactId: contact.id,
      eventType: "booking_cancelled",
      title: "Meeting cancelled",
      metadata: { booking_id: bookingId },
    });

    return { contactFound: true };
  } catch (crmError) {
    logger.error("CRM sync error during cancellation:", crmError);
    return { contactFound: true };
  }
}
