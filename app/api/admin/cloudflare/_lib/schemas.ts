import { z } from "zod";

const positiveIntSchema = z.coerce.number().int().min(1);
const booleanQuerySchema = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());
export const cloudflareZoneQuerySchema = z.object({
  zoneName: z.string().trim().toLowerCase().min(1).optional(),
});

const paginationQuerySchema = cloudflareZoneQuerySchema.extend({
  page: positiveIntSchema.optional(),
  perPage: positiveIntSchema.max(100).optional(),
});

const emptyBodySchema = z.object({}).strict();

const dnsRecordTypeSchema = z.enum(["A", "CNAME", "TXT", "MX"]);

const dnsBaseRecordSchema = z.object({
  name: z.string().trim().min(1, "DNS record name is required"),
  content: z.string().trim().min(1, "DNS record content is required"),
  ttl: z.number().int().min(1).optional(),
  comment: z.string().trim().min(1).max(500).optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
});

export const dnsRecordsQuerySchema = paginationQuerySchema.extend({
  type: dnsRecordTypeSchema.optional(),
  name: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  proxied: booleanQuerySchema.optional(),
  match: z.enum(["any", "all"]).optional(),
  order: z.enum(["type", "name", "content", "ttl", "proxied"]).optional(),
  direction: z.enum(["asc", "desc"]).optional(),
});

export const dnsRecordInputSchema = z.discriminatedUnion("type", [
  dnsBaseRecordSchema
    .extend({
      type: z.literal("A"),
      proxied: z.boolean().optional(),
      privateRouting: z.boolean().optional(),
      settings: z
        .object({
          ipv4Only: z.boolean().optional(),
          ipv6Only: z.boolean().optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
  dnsBaseRecordSchema
    .extend({
      type: z.literal("CNAME"),
      proxied: z.boolean().optional(),
      settings: z
        .object({
          flattenCname: z.boolean().optional(),
          ipv4Only: z.boolean().optional(),
          ipv6Only: z.boolean().optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
  dnsBaseRecordSchema.extend({ type: z.literal("TXT") }).strict(),
  dnsBaseRecordSchema
    .extend({
      type: z.literal("MX"),
      priority: z.number().int().min(0).max(65535),
    })
    .strict(),
]);

export const dnsRecordMutationSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    record: dnsRecordInputSchema,
  })
  .strict();

const redirectTargetUrlSchema = z.union([
  z.object({ value: z.string().url(), expression: z.never().optional() }).strict(),
  z.object({ expression: z.string().trim().min(1), value: z.never().optional() }).strict(),
]);

const redirectRuleSchema = z
  .object({
    expression: z.string().trim().min(1, "Redirect expression is required"),
    targetUrl: redirectTargetUrlSchema,
    statusCode: z.union([
      z.literal(301),
      z.literal(302),
      z.literal(303),
      z.literal(307),
      z.literal(308),
    ]),
    description: z.string().trim().min(1).max(500).optional(),
    ref: z.string().trim().min(1).optional(),
    enabled: z.boolean().optional(),
    preserveQueryString: z.boolean().optional(),
  })
  .strict();

export const redirectRulesetMutationSchema = z
  .object({
    mode: z.enum(["create", "update"]).default("update"),
    ruleset: z
      .object({
        name: z.string().trim().min(1).max(100).optional(),
        description: z.string().trim().min(1).max(500).optional(),
        rules: z.array(redirectRuleSchema).min(1).max(50),
      })
      .strict(),
  })
  .strict();

export const emailDestinationsQuerySchema = paginationQuerySchema.extend({
  verified: booleanQuerySchema.optional(),
  direction: z.enum(["asc", "desc"]).optional(),
});

export const emailDestinationMutationSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
  })
  .strict();

export const emailRoutingRulesQuerySchema = paginationQuerySchema.extend({
  enabled: booleanQuerySchema.optional(),
});

const emailRoutingActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("forward"),
      value: z.array(z.string().trim().toLowerCase().email()).min(1).max(20),
    })
    .strict(),
  z
    .object({
      type: z.literal("drop"),
      value: z.array(z.string().trim().min(1)).max(20).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("worker"),
      value: z.array(z.string().trim().min(1)).min(1).max(20),
    })
    .strict(),
]);

const emailRoutingMatcherSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("literal"),
      field: z.literal("to"),
      value: z.string().trim().toLowerCase().email(),
    })
    .strict(),
  z
    .object({
      type: z.literal("all"),
      field: z.literal("to").optional(),
      value: z.string().trim().min(1).optional(),
    })
    .strict(),
]);

export const emailRoutingRuleMutationSchema = z
  .object({
    actions: z.array(emailRoutingActionSchema).min(1).max(10),
    matchers: z.array(emailRoutingMatcherSchema).min(1).max(10),
    enabled: z.boolean().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    priority: z.number().int().min(0).optional(),
  })
  .strict();

export const enableEmailRoutingMutationSchema = emptyBodySchema;

export type DnsRecordInput = z.infer<typeof dnsRecordInputSchema>;
export type DnsRecordsQuery = z.infer<typeof dnsRecordsQuerySchema>;
export type RedirectRulesetMutation = z.infer<typeof redirectRulesetMutationSchema>;
export type EmailRoutingRuleMutation = z.infer<typeof emailRoutingRuleMutationSchema>;
