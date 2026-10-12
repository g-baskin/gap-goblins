import type { ResendWebhookEvent } from "@/lib/outreach/webhooks/types";

export const AUTOMATION_FLOW_STATUSES = ["draft", "active", "paused", "archived"] as const;
export type AutomationFlowStatus = (typeof AUTOMATION_FLOW_STATUSES)[number];

export const AUTOMATION_TRIGGER_TYPES = [
  "newsletter_subscriber_verified",
  "manual_enrollment",
  "contact_created",
  "contact_status_changed",
  "contact_tag_added",
  "booking_created",
  "deal_stage_changed",
] as const;
export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export const AUTOMATION_TRIGGER_OPTIONS: Array<{
  value: AutomationTriggerType;
  label: string;
  description: string;
}> = [
  {
    value: "newsletter_subscriber_verified",
    label: "Newsletter subscriber verified",
    description: "Runs when a newsletter subscriber verifies or is added as verified.",
  },
  {
    value: "manual_enrollment",
    label: "Manual enrollment",
    description: "Only runs when an admin manually enrolls a subscriber or CRM contact.",
  },
  {
    value: "contact_created",
    label: "CRM contact created",
    description: "Runs when a CRM contact is created by configured CRM sync paths.",
  },
  {
    value: "contact_status_changed",
    label: "Contact status changed",
    description: "Runs when a CRM contact reaches the configured status filter.",
  },
  {
    value: "contact_tag_added",
    label: "Contact tag added",
    description: "Runs when a CRM contact receives a tag listed in the audience filter.",
  },
  {
    value: "booking_created",
    label: "Booking created",
    description: "Runs when a real Cal.com booking is recorded against a CRM contact.",
  },
  {
    value: "deal_stage_changed",
    label: "Deal stage changed",
    description: "Runs when a CRM deal is moved into a matching stage.",
  },
];

export const AUTOMATION_STEP_TYPES = [
  "send_email",
  "wait",
  "add_tag",
  "update_contact_status",
] as const;
export type AutomationStepType = (typeof AUTOMATION_STEP_TYPES)[number];

export const AUTOMATION_DELAY_UNITS = ["minutes", "hours", "days"] as const;
export type AutomationDelayUnit = (typeof AUTOMATION_DELAY_UNITS)[number];

export const AUTOMATION_ENROLLMENT_STATUSES = [
  "active",
  "paused",
  "completed",
  "stopped",
  "converted",
  "bounced",
  "unsubscribed",
  "complained",
] as const;
export type AutomationEnrollmentStatus = (typeof AUTOMATION_ENROLLMENT_STATUSES)[number];

export const AUTOMATION_ENGAGEMENT_STAGES = [
  "enrolled",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "engaged",
  "hot",
  "converted",
  "stopped",
] as const;
export type AutomationEngagementStage = (typeof AUTOMATION_ENGAGEMENT_STAGES)[number];

export const AUTOMATION_EVENT_TYPES = [
  "enrolled",
  "step_queued",
  "step_sent",
  "action_completed",
  "action_skipped",
  "completed",
  "stopped",
  "converted",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "failed",
  "suppressed",
  "unsubscribed",
] as const;
export type AutomationEventType = (typeof AUTOMATION_EVENT_TYPES)[number];

export interface AutomationSendStepPayload {
  enrollmentId: string;
  flowId: string;
  stepId?: string;
  expectedStepOrder?: number;
}

export interface AutomationEnrollPayload {
  flowId: string;
  subscriberId?: string;
  contactId?: string;
}

export interface ConversionRule {
  pattern: string;
  action?: "mark_hot" | "convert";
  label?: string;
}

export type AutomationWebhookEvent = ResendWebhookEvent;
