import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { createCallTask } from "./call-task";
import { registeredActionCatalog } from "./catalog";
import { appendTimelineNote, setContactField } from "./contact";
import { createPipelineDeal, movePipelineDeal } from "./pipeline";
import type { ActionDatabase, ActionExecutionContext, ActionExecutionResult } from "./types";

const outputSchema = z.record(z.string(), z.unknown());
const entries = [
  {
    id: "contact.timeline_note",
    version: 1,
    configSchema: z.object({ note: z.string().trim().min(1).max(10_000) }).strict(),
    inputSchema: z.object({}).passthrough(),
    outputSchema,
    execute: appendTimelineNote,
  },
  {
    id: "contact.set_field",
    version: 1,
    configSchema: z
      .object({
        field: z.enum([
          "company",
          "contactStatus",
          "firstName",
          "jobTitle",
          "lastName",
          "location",
          "notes",
          "phone",
        ]),
        value: z.string().max(10_000),
      })
      .strict(),
    inputSchema: z.object({}).passthrough(),
    outputSchema,
    execute: setContactField,
  },
  {
    id: "pipeline.create_deal",
    version: 1,
    configSchema: z
      .object({
        pipelineId: z.uuid(),
        stageId: z.uuid(),
        name: z.string().trim().min(1).max(200),
        amount: z.number().nonnegative().max(1_000_000_000).optional(),
      })
      .strict(),
    inputSchema: z.object({}).passthrough(),
    outputSchema,
    execute: createPipelineDeal,
  },
  {
    id: "pipeline.move_deal",
    version: 1,
    configSchema: z.object({ dealId: z.uuid().optional(), stageId: z.uuid() }).strict(),
    inputSchema: z.object({}).passthrough(),
    outputSchema,
    execute: movePipelineDeal,
  },
  {
    id: "call_task.create",
    version: 1,
    configSchema: z
      .object({
        script: z.string().trim().min(1).max(10_000),
        dueOffsetMinutes: z.number().int().min(0).max(525_600),
        assignedToUserId: z.uuid().optional(),
        dealId: z.uuid().optional(),
      })
      .strict(),
    inputSchema: z.object({}).passthrough(),
    outputSchema,
    execute: createCallTask,
  },
] as const;

type RegistryEntry = (typeof entries)[number];

export function getRegisteredAction(id: string, version: number): RegistryEntry | null {
  return entries.find((entry) => entry.id === id && entry.version === version) ?? null;
}

export function getRegisteredActionCatalog() {
  return registeredActionCatalog;
}

export function validateRegisteredAction(id: string, version: number, values: unknown) {
  const entry = getRegisteredAction(id, version);
  if (!entry) throw new Error(`Unknown registered action ${id}@${version}`);
  return entry.configSchema.parse(values);
}

export async function executeRegisteredAction(
  id: string,
  version: number,
  values: unknown,
  context: ActionExecutionContext,
  database: ActionDatabase = db,
): Promise<ActionExecutionResult> {
  const entry = getRegisteredAction(id, version);
  if (!entry) throw new Error(`Unknown registered action ${id}@${version}`);
  const config = entry.configSchema.parse(values) as never;
  const result = await entry.execute(database, context, config);
  return { ...result, output: entry.outputSchema.parse(result.output) };
}
