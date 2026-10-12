import { z } from "zod";
import {
  HUMAN_NUDGE_PRIORITIES,
  HUMAN_NUDGE_STATUSES,
  HUMAN_NUDGE_SUGGESTED_ACTIONS,
} from "@/lib/nudges/types";

const nullableUuidSchema = z.uuid().nullable().optional();
const dueDateSchema = z.iso.datetime({ offset: true });

export const createHumanNudgeSchema = z.object({
  contactId: nullableUuidSchema,
  dealId: nullableUuidSchema,
  nudgeType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1).max(5000),
  suggestedAction: z.enum(HUMAN_NUDGE_SUGGESTED_ACTIONS).nullable().optional(),
  priority: z.enum(HUMAN_NUDGE_PRIORITIES).optional(),
  dueDate: dueDateSchema.optional(),
  assignedToUserId: nullableUuidSchema,
  dedupKey: z.string().trim().min(1).max(255).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const listHumanNudgesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.union([z.enum(HUMAN_NUDGE_STATUSES), z.literal("all")]).optional(),
  priority: z.union([z.enum(HUMAN_NUDGE_PRIORITIES), z.literal("all")]).optional(),
  contactId: z.uuid().optional(),
  dealId: z.uuid().optional(),
  due: z.enum(["all", "due", "upcoming"]).optional(),
});

export const updateHumanNudgeSchema = z
  .object({
    status: z.enum(HUMAN_NUDGE_STATUSES).optional(),
    snoozedUntil: dueDateSchema.nullable().optional(),
    title: z.string().trim().min(1).max(255).optional(),
    message: z.string().trim().min(1).max(5000).optional(),
    suggestedAction: z.enum(HUMAN_NUDGE_SUGGESTED_ACTIONS).nullable().optional(),
    priority: z.enum(HUMAN_NUDGE_PRIORITIES).optional(),
    dueDate: dueDateSchema.optional(),
    assignedToUserId: nullableUuidSchema,
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const snoozeHumanNudgeSchema = z.object({
  snoozedUntil: dueDateSchema,
});
