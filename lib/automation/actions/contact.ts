import { and, eq } from "drizzle-orm";
import { contacts, contactTimeline } from "@/lib/db/schema";
import type { ActionDatabase, ActionExecutionContext, ActionExecutionResult } from "./types";

export async function appendTimelineNote(
  database: ActionDatabase,
  context: ActionExecutionContext,
  values: { note: string },
): Promise<ActionExecutionResult> {
  const [contact] = await database
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, context.contactId), eq(contacts.tenantId, context.tenantId)))
    .limit(1);
  if (!contact) throw new Error("Contact not found in tenant");
  const [created] = await database
    .insert(contactTimeline)
    .values({
      tenantId: context.tenantId,
      contactId: contact.id,
      eventType: "automation_note",
      title: "Automation note",
      description: values.note,
      metadata: { enrollmentId: context.enrollmentId, runId: context.runId },
      createdAt: (context.now ?? new Date()).toISOString(),
    })
    .returning({ id: contactTimeline.id });
  if (!created) throw new Error("Timeline note was not created");
  return { state: "succeeded", output: { timelineId: created.id } };
}

const contactFieldColumns = {
  company: contacts.company,
  contactStatus: contacts.contactStatus,
  firstName: contacts.firstName,
  jobTitle: contacts.jobTitle,
  lastName: contacts.lastName,
  location: contacts.location,
  notes: contacts.notes,
  phone: contacts.phone,
} as const;

export type EditableContactField = keyof typeof contactFieldColumns;

export async function setContactField(
  database: ActionDatabase,
  context: ActionExecutionContext,
  values: { field: EditableContactField; value: string },
): Promise<ActionExecutionResult> {
  const column = contactFieldColumns[values.field];
  if (!column) throw new Error("Contact field is not editable");
  const [updated] = await database
    .update(contacts)
    .set({ [values.field]: values.value, updatedAt: (context.now ?? new Date()).toISOString() })
    .where(and(eq(contacts.id, context.contactId), eq(contacts.tenantId, context.tenantId)))
    .returning({ id: contacts.id });
  if (!updated) throw new Error("Contact not found in tenant");
  return { state: "succeeded", output: { contactId: updated.id, field: values.field } };
}
