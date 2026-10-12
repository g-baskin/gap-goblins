import { z } from "zod";
import {
  AUTOMATION_DELAY_UNITS,
  AUTOMATION_FLOW_STATUSES,
  AUTOMATION_STEP_TYPES,
  AUTOMATION_TRIGGER_TYPES,
} from "@/lib/automation/types";

const optionalEmailSchema = z.union([z.email(), z.literal(""), z.null()]).optional();

export const createAutomationFlowSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(AUTOMATION_FLOW_STATUSES).optional(),
  triggerType: z.enum(AUTOMATION_TRIGGER_TYPES),
  audienceFilter: z.unknown().optional(),
  fromName: z.string().trim().max(160).nullable().optional(),
  fromEmail: optionalEmailSchema,
  replyTo: optionalEmailSchema,
  trackOpens: z.boolean().optional(),
  trackClicks: z.boolean().optional(),
  stopOnUnsubscribe: z.boolean().optional(),
  stopOnBounce: z.boolean().optional(),
  stopOnComplaint: z.boolean().optional(),
  conversionRules: z.unknown().optional(),
});

export const updateAutomationFlowSchema = createAutomationFlowSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const baseAutomationStepSchema = z.object({
  stepOrder: z.number().int().positive().optional(),
  stepType: z.enum(AUTOMATION_STEP_TYPES),
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().max(240).nullable().optional(),
  bodyHtml: z.string().nullable().optional(),
  bodyText: z.string().nullable().optional(),
  delayAmount: z.number().int().min(0).max(365).optional(),
  delayUnit: z.enum(AUTOMATION_DELAY_UNITS).optional(),
  settings: z.unknown().optional(),
});

export const replaceAutomationStepsSchema = z.object({
  steps: z
    .array(
      baseAutomationStepSchema.superRefine((step, ctx) => {
        if (step.stepType === "add_tag") {
          const settings = parseObjectSettings(step.settings);
          const tags = Array.isArray(settings.tags) ? settings.tags : [];
          const hasTag = tags.some((tag) => typeof tag === "string" && tag.trim().length > 0);
          if (!hasTag) {
            ctx.addIssue({
              code: "custom",
              message: "Add tag steps require at least one tag in settings.tags",
              path: ["settings", "tags"],
            });
          }
        }

        if (step.stepType === "update_contact_status") {
          const settings = parseObjectSettings(step.settings);
          if (typeof settings.status !== "string" || settings.status.trim().length === 0) {
            ctx.addIssue({
              code: "custom",
              message: "Update status steps require settings.status",
              path: ["settings", "status"],
            });
          }
        }
      }),
    )
    .max(20),
});

function parseObjectSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export const manualEnrollmentSchema = z
  .object({
    subscriberId: z.uuid().optional(),
    contactId: z.uuid().optional(),
  })
  .refine((value) => Boolean(value.subscriberId || value.contactId), {
    message: "subscriberId or contactId is required",
  });
