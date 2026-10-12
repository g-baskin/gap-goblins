import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ============================================================================
// 1. admin_audit_log
// ============================================================================
export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  resourceId: text("resource_id"),
  resourceType: text("resource_type"),
  userAgent: text("user_agent"),
  userId: uuid("user_id"),
});

// ============================================================================
// 2. admin_invitations
// ============================================================================
export const adminInvitations = pgTable("admin_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  invitedBy: uuid("invited_by"),
  lastResentAt: timestamp("last_resent_at", { withTimezone: true, mode: "string" }),
  message: text("message"),
  resentCount: integer("resent_count"),
  role: text("role").notNull().default("admin"),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
  status: text("status"),
  tokenHash: text("token_hash").notNull(),
});

// ============================================================================
// 3. admin_sessions
// ============================================================================
export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  city: text("city"),
  country: text("country"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  deviceName: text("device_name"),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  ipAddress: text("ip_address"),
  isCurrent: boolean("is_current"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true, mode: "string" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  sessionToken: text("session_token").notNull(),
  userAgent: text("user_agent"),
  userId: uuid("user_id").notNull(),
});

// ============================================================================
// 4. admin_settings
// ============================================================================
export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  language: text("language"),
  notificationEmail: text("notification_email"),
  notifyCalBooking: boolean("notify_cal_booking"),
  notifyNewContact: boolean("notify_new_contact"),
  notifyNewSubscriber: boolean("notify_new_subscriber"),
  theme: text("theme"),
  timezone: text("timezone"),
  skinId: text("skin_id").default("concrete"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  userId: uuid("user_id").notNull().unique(),
});

// ============================================================================
// 5. admin_users
// ============================================================================
export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    avatarUrl: text("avatar_url"),
    backupCodes: text("backup_codes").array(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true, mode: "string" }),
    failedLoginAttempts: integer("failed_login_attempts"),
    isActive: boolean("is_active"),
    jobTitle: text("job_title"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "string" }),
    lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "string" }),
    name: text("name"),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true, mode: "string" }),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("admin"),
    tokensValidFrom: timestamp("tokens_valid_from", { withTimezone: true, mode: "string" }),
    totpEnabled: boolean("totp_enabled"),
    totpSecret: text("totp_secret"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [uniqueIndex("admin_users_email_unique_idx").on(sql`lower(${table.email})`)],
);

// ============================================================================
// 6. automation_flows
// ============================================================================
export const automationFlows = pgTable(
  "automation_flows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    executionMode: text("execution_mode").notNull().default("linear"),
    draftRevisionId: uuid("draft_revision_id").references(
      (): AnyPgColumn => automationWorkflowRevisions.id,
    ),
    publishedRevisionId: uuid("published_revision_id").references(
      (): AnyPgColumn => automationWorkflowRevisions.id,
    ),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    triggerType: text("trigger_type").notNull(),
    audienceFilter: jsonb("audience_filter").notNull().default({}),
    fromName: text("from_name"),
    fromEmail: text("from_email"),
    replyTo: text("reply_to"),
    trackOpens: boolean("track_opens").notNull().default(true),
    trackClicks: boolean("track_clicks").notNull().default(true),
    stopOnUnsubscribe: boolean("stop_on_unsubscribe").notNull().default(true),
    stopOnBounce: boolean("stop_on_bounce").notNull().default(true),
    stopOnComplaint: boolean("stop_on_complaint").notNull().default(true),
    conversionRules: jsonb("conversion_rules").notNull().default([]),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("automation_flows_status_idx").on(table.status),
    index("automation_flows_tenant_status_idx").on(table.tenantId, table.status),
    index("automation_flows_trigger_type_idx").on(table.triggerType),
  ],
);

// ============================================================================
// 6b. automation_steps
// ============================================================================
export const automationSteps = pgTable(
  "automation_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    flowId: uuid("flow_id").notNull(),
    stepOrder: integer("step_order").notNull(),
    stepType: text("step_type").notNull(),
    name: text("name").notNull(),
    subject: text("subject"),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    delayAmount: integer("delay_amount").notNull().default(0),
    delayUnit: text("delay_unit").notNull().default("minutes"),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("automation_steps_flow_id_idx").on(table.flowId),
    uniqueIndex("automation_steps_flow_order_unique_idx").on(table.flowId, table.stepOrder),
  ],
);

// ============================================================================
// 6c. automation_enrollments
// ============================================================================
export const automationEnrollments = pgTable(
  "automation_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    flowId: uuid("flow_id").notNull(),
    revisionId: uuid("revision_id").references((): AnyPgColumn => automationWorkflowRevisions.id),
    subscriberId: uuid("subscriber_id"),
    contactId: uuid("contact_id"),
    email: text("email").notNull(),
    status: text("status").notNull().default("active"),
    currentStepId: uuid("current_step_id"),
    currentStepOrder: integer("current_step_order").notNull().default(0),
    engagementStage: text("engagement_stage").notNull().default("enrolled"),
    engagementScore: integer("engagement_score").notNull().default(0),
    openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }),
    clickedAt: timestamp("clicked_at", { withTimezone: true, mode: "string" }),
    convertedAt: timestamp("converted_at", { withTimezone: true, mode: "string" }),
    stoppedAt: timestamp("stopped_at", { withTimezone: true, mode: "string" }),
    stopReason: text("stop_reason"),
    nextStepAt: timestamp("next_step_at", { withTimezone: true, mode: "string" }),
    lastEventAt: timestamp("last_event_at", { withTimezone: true, mode: "string" }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("automation_enrollments_flow_id_idx").on(table.flowId),
    index("automation_enrollments_tenant_status_idx").on(table.tenantId, table.status),
    index("automation_enrollments_subscriber_id_idx").on(table.subscriberId),
    index("automation_enrollments_contact_id_idx").on(table.contactId),
    index("automation_enrollments_status_next_step_idx").on(table.status, table.nextStepAt),
    uniqueIndex("automation_enrollments_flow_subscriber_unique_idx")
      .on(table.flowId, table.subscriberId)
      .where(sql`${table.subscriberId} IS NOT NULL`),
    uniqueIndex("automation_enrollments_flow_contact_unique_idx")
      .on(table.flowId, table.contactId)
      .where(sql`${table.contactId} IS NOT NULL`),
  ],
);

// ============================================================================
// 6d. automation_sends
// ============================================================================
export const automationSends = pgTable(
  "automation_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    flowId: uuid("flow_id").notNull(),
    stepId: uuid("step_id").notNull(),
    enrollmentId: uuid("enrollment_id").notNull(),
    subscriberId: uuid("subscriber_id"),
    contactId: uuid("contact_id"),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    fromEmail: text("from_email"),
    fromName: text("from_name"),
    replyTo: text("reply_to"),
    status: text("status").notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    errorMessage: text("error_message"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "string" }),
    openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }),
    firstClickAt: timestamp("first_click_at", { withTimezone: true, mode: "string" }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true, mode: "string" }),
    complainedAt: timestamp("complained_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("automation_sends_enrollment_id_idx").on(table.enrollmentId),
    index("automation_sends_tenant_status_idx").on(table.tenantId, table.status),
    index("automation_sends_provider_message_id_idx").on(table.providerMessageId),
    index("automation_sends_status_idx").on(table.status),
    uniqueIndex("automation_sends_enrollment_step_unique_idx").on(table.enrollmentId, table.stepId),
  ],
);

// ============================================================================
// 6e. automation_events
// ============================================================================
export const automationEvents = pgTable(
  "automation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    flowId: uuid("flow_id"),
    stepId: uuid("step_id"),
    enrollmentId: uuid("enrollment_id"),
    sendId: uuid("send_id"),
    subscriberId: uuid("subscriber_id"),
    contactId: uuid("contact_id"),
    eventType: text("event_type").notNull(),
    providerMessageId: text("provider_message_id"),
    svixId: text("svix_id"),
    linkUrl: text("link_url"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    eventData: jsonb("event_data"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("automation_events_enrollment_id_idx").on(table.enrollmentId),
    index("automation_events_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("automation_events_send_id_idx").on(table.sendId),
    index("automation_events_event_type_idx").on(table.eventType),
    uniqueIndex("automation_events_svix_id_unique_idx")
      .on(table.svixId)
      .where(sql`${table.svixId} IS NOT NULL`),
  ],
);

// ============================================================================
// 7. blog_posts
// ============================================================================
export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorName: text("author_name").notNull().default("Jake Simons"),
  authorUrl: text("author_url"),
  category: text("category").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  datePublished: timestamp("date_published", { withTimezone: true, mode: "string" }).notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  published: boolean("published").notNull().default(false),
  readTime: text("read_time"),
  slug: text("slug").notNull().unique(),
  tags: text("tags").array(),
  title: text("title").notNull(),
  tldr: text("tldr"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 7. chat_documents
// ============================================================================
export const chatDocuments = pgTable("chat_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  kind: text("kind").notNull().default("text"),
  title: text("title").notNull(),
  userId: uuid("user_id").notNull(),
});

// ============================================================================
// 8. chat_messages
// ============================================================================
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  attachments: jsonb("attachments").notNull().default([]),
  chatId: uuid("chat_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  parts: jsonb("parts").notNull().default([]),
  role: text("role").notNull(),
});

// ============================================================================
// 9. chat_streams
// ============================================================================
export const chatStreams = pgTable("chat_streams", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 10. chat_suggestions
// ============================================================================
export const chatSuggestions = pgTable("chat_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  description: text("description"),
  documentCreatedAt: timestamp("document_created_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  documentId: uuid("document_id").notNull(),
  isResolved: boolean("is_resolved").notNull().default(false),
  originalText: text("original_text").notNull(),
  suggestedText: text("suggested_text").notNull(),
  userId: uuid("user_id").notNull(),
});

// ============================================================================
// 11. chat_votes (composite primary key)
// ============================================================================
export const chatVotes = pgTable(
  "chat_votes",
  {
    chatId: uuid("chat_id").notNull(),
    isUpvoted: boolean("is_upvoted").notNull(),
    messageId: uuid("message_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.chatId, table.messageId] })],
);

// ============================================================================
// 12. chats
// ============================================================================
export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  title: text("title").notNull(),
  userId: uuid("user_id").notNull(),
  visibility: text("visibility").notNull().default("private"),
});

// ============================================================================
// 13. contact_pipeline_stages
// ============================================================================
export const contactPipelineStages = pgTable("contact_pipeline_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(),
  enteredAt: timestamp("entered_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  pipelineId: uuid("pipeline_id").notNull(),
  stageId: uuid("stage_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 14. contact_submissions
// ============================================================================
export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingDateTime: timestamp("booking_date_time", { withTimezone: true, mode: "string" }),
  businessName: text("business_name"),
  calBookingId: text("cal_booking_id"),
  contactId: uuid("contact_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  followUpSentAt: timestamp("follow_up_sent_at", { withTimezone: true, mode: "string" }),
  lastName: text("last_name").notNull(),
  mobile: text("mobile").notNull(),
  notes: text("notes").notNull(),
  productInterest: text("product_interest"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 15. contact_timeline
// ============================================================================
export const contactTimeline = pgTable("contact_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  contactId: uuid("contact_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  description: text("description"),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata"),
  oldStageId: uuid("old_stage_id"),
  pipelineId: uuid("pipeline_id"),
  stageId: uuid("stage_id"),
  title: text("title").notNull(),
});

// ============================================================================
// 16. contacts
// ============================================================================
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    company: text("company"),
    contactStatus: text("contact_status"),
    country: text("country"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
    email: text("email").notNull(),
    firstName: text("first_name"),
    firstTouchDate: timestamp("first_touch_date", { withTimezone: true, mode: "string" }),
    industry: text("industry"),
    isNewsletterSubscriber: boolean("is_newsletter_subscriber").notNull().default(false),
    jobTitle: text("job_title"),
    lastName: text("last_name"),
    lastTouchDate: timestamp("last_touch_date", { withTimezone: true, mode: "string" }),
    latestCampaignId: uuid("latest_campaign_id"),
    latestSource: text("latest_source"),
    latestSourceDetail: text("latest_source_detail"),
    latestUtmCampaign: text("latest_utm_campaign"),
    latestUtmMedium: text("latest_utm_medium"),
    latestUtmSource: text("latest_utm_source"),
    linkedinUrl: text("linkedin_url"),
    location: text("location"),
    notes: text("notes"),
    originalCampaignId: uuid("original_campaign_id"),
    originalSource: text("original_source"),
    originalSourceDetail: text("original_source_detail"),
    originalUtmCampaign: text("original_utm_campaign"),
    originalUtmMedium: text("original_utm_medium"),
    originalUtmSource: text("original_utm_source"),
    phone: text("phone"),
    seniority: text("seniority"),
    source: text("source").notNull(),
    sourceDetail: text("source_detail"),
    tags: text("tags").array(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
    website: text("website"),
  },
  (table) => [
    index("contacts_source_idx").on(table.source),
    index("contacts_tenant_email_idx").on(table.tenantId, table.email),
    index("contacts_created_at_idx").on(table.createdAt),
  ],
);

// ============================================================================
// 17. deal_stage_history
// ============================================================================
export const dealStageHistory = pgTable(
  "deal_stage_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    automated: boolean("automated"),
    changedAt: timestamp("changed_at", { withTimezone: true, mode: "string" }),
    changedBy: uuid("changed_by"),
    dealId: uuid("deal_id").notNull(),
    fromStageId: uuid("from_stage_id"),
    notes: text("notes"),
    toStageId: uuid("to_stage_id").notNull(),
    triggerSource: text("trigger_source"),
  },
  (table) => [
    index("deal_stage_history_deal_id_idx").on(table.dealId),
    index("deal_stage_history_changed_at_idx").on(table.changedAt),
  ],
);

// ============================================================================
// 18. deals
// ============================================================================
export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    amount: real("amount"),
    contactId: uuid("contact_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
    expectedCloseDate: timestamp("expected_close_date", { withTimezone: true, mode: "string" }),
    lostAt: timestamp("lost_at", { withTimezone: true, mode: "string" }),
    lostReason: text("lost_reason"),
    meetingBookedAt: timestamp("meeting_booked_at", { withTimezone: true, mode: "string" }),
    name: text("name").notNull(),
    notes: text("notes"),
    probability: integer("probability"),
    source: text("source").notNull(),
    stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true, mode: "string" }),
    stageId: uuid("stage_id").notNull(),
    status: text("status"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
    wonAt: timestamp("won_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("deals_stage_id_idx").on(table.stageId),
    index("deals_tenant_stage_idx").on(table.tenantId, table.stageId),
    index("deals_status_idx").on(table.status),
    index("deals_updated_at_idx").on(table.updatedAt),
    index("deals_created_at_idx").on(table.createdAt),
    index("deals_contact_id_idx").on(table.contactId),
  ],
);

// ============================================================================
// 19. human_nudges
// ============================================================================
export const humanNudges = pgTable(
  "human_nudges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id"),
    dealId: uuid("deal_id"),
    nudgeType: text("nudge_type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    suggestedAction: text("suggested_action"),
    priority: text("priority").notNull().default("medium"),
    dueDate: timestamp("due_date", { withTimezone: true, mode: "string" }).notNull(),
    status: text("status").notNull().default("pending"),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true, mode: "string" }),
    deliveredVia: text("delivered_via"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "string" }),
    actedAt: timestamp("acted_at", { withTimezone: true, mode: "string" }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true, mode: "string" }),
    assignedToUserId: uuid("assigned_to_user_id"),
    dedupKey: text("dedup_key"),
    metadata: jsonb("metadata").notNull().default({}),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("human_nudges_contact_id_idx").on(table.contactId),
    index("human_nudges_deal_id_idx").on(table.dealId),
    index("human_nudges_status_due_date_idx").on(table.status, table.dueDate),
    index("human_nudges_type_idx").on(table.nudgeType),
    uniqueIndex("human_nudges_dedup_key_unique_idx")
      .on(table.dedupKey)
      .where(sql`${table.dedupKey} IS NOT NULL`),
  ],
);

// ============================================================================
// 20. email_replies
// ============================================================================
export const emailReplies = pgTable("email_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  autoDealCreated: boolean("auto_deal_created"),
  autoReplySent: boolean("auto_reply_sent"),
  autoReplyTemplate: text("auto_reply_template"),
  campaignId: uuid("campaign_id"),
  classificationModel: text("classification_model"),
  classificationPrompt: text("classification_prompt"),
  contactId: uuid("contact_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  dealId: uuid("deal_id"),
  fromEmail: text("from_email"),
  intentScore: real("intent_score"),
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
  processingError: text("processing_error"),
  replyDate: timestamp("reply_date", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  replyText: text("reply_text"),
  sentiment: text("sentiment"),
  subject: text("subject"),
});

// ============================================================================
// 20. faqs
// ============================================================================
export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  answer: text("answer").notNull(),
  category: text("category").notNull().default("General"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  displayOrder: integer("display_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  question: text("question").notNull(),
  tags: text("tags").array(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 21. integration_credentials
// ============================================================================
export const integrationCredentials = pgTable("integration_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  credentialType: text("credential_type").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  encryptionIv: text("encryption_iv").notNull(),
  encryptionTag: text("encryption_tag").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  integrationId: uuid("integration_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 22. integrations
// ============================================================================
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  isConnected: boolean("is_connected").notNull().default(false),
  isEnabled: boolean("is_enabled").notNull().default(false),
  lastConnectedAt: timestamp("last_connected_at", { withTimezone: true, mode: "string" }),
  lastError: text("last_error"),
  provider: text("provider").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  userId: uuid("user_id").notNull(),
});

// ============================================================================
// 23. newsletter_articles
// ============================================================================
export const newsletterArticles = pgTable("newsletter_articles", {
  id: text("id").primaryKey(),
  author: text("author"),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  embedding: text("embedding"),
  engagement: jsonb("engagement"),
  keyInsights: text("key_insights").array(),
  metadata: jsonb("metadata"),
  psychologyPrinciple: text("psychology_principle"),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }).notNull(),
  scoreEngagement: real("score_engagement"),
  scoreFinal: real("score_final"),
  scoreReadability: real("score_readability"),
  scoreRecency: real("score_recency"),
  scoreRelevance: real("score_relevance"),
  source: text("source").notNull(),
  status: text("status").notNull().default("pending"),
  summary: text("summary"),
  title: text("title").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  url: text("url").notNull().unique(),
});

// ============================================================================
// 24. newsletter_campaigns
// ============================================================================
export const newsletterCampaigns = pgTable("newsletter_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleLimit: integer("article_limit").notNull().default(50),
  avgClickRate: real("avg_click_rate").notNull().default(0),
  avgOpenRate: real("avg_open_rate").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  description: text("description"),
  frequency: text("frequency").notNull(),
  name: text("name").notNull(),
  platforms: text("platforms").array().notNull().default(sql`ARRAY['email']::text[]`),
  psychologyMode: text("psychology_mode").notNull().default("curiosity-driven"),
  sendDays: integer("send_days").array().notNull().default(sql`ARRAY[2,3,4]::int[]`),
  sendTime: text("send_time").notNull(),
  sources: jsonb("sources").notNull().default([]),
  status: text("status").notNull().default("draft"),
  summarizerModel: text("summarizer_model").notNull().default("claude-3-5-sonnet-20241022"),
  templateId: uuid("template_id"),
  timezone: text("timezone").notNull().default("Australia/Perth"),
  totalClicks: integer("total_clicks").notNull().default(0),
  totalOpens: integer("total_opens").notNull().default(0),
  totalSent: integer("total_sent").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 25. newsletter_editions
// ============================================================================
export const newsletterEditions = pgTable(
  "newsletter_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleCount: integer("article_count").notNull().default(0),
    campaignId: uuid("campaign_id"),
    contentHtml: text("content_html").notNull(),
    contentText: text("content_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by"),
    curatedArticles: text("curated_articles").array().notNull().default(sql`ARRAY[]::text[]`),
    preheader: text("preheader"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
    stats: jsonb("stats").notNull().default({}),
    status: text("status").notNull().default("draft"),
    subject: text("subject").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("newsletter_editions_status_idx").on(table.status),
    index("newsletter_editions_sent_at_idx").on(table.sentAt),
  ],
);

// ============================================================================
// 25b. newsletter_send_queue
// ============================================================================
export const newsletterSendQueue = pgTable("newsletter_send_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id").notNull(),
  subscriberId: uuid("subscriber_id").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject"),
  fromEmail: text("from_email"),
  fromName: text("from_name"),
  replyTo: text("reply_to"),
  status: text("status").notNull().default("queued"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "string" }),
  openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }),
  firstClickAt: timestamp("first_click_at", { withTimezone: true, mode: "string" }),
  bouncedAt: timestamp("bounced_at", { withTimezone: true, mode: "string" }),
  complainedAt: timestamp("complained_at", { withTimezone: true, mode: "string" }),
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 26. newsletter_events
// ============================================================================
export const newsletterEvents = pgTable("newsletter_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  eventData: jsonb("event_data"),
  eventType: text("event_type").notNull(),
  ipAddress: text("ip_address"),
  subscriberId: uuid("subscriber_id"),
  userAgent: text("user_agent"),
});

// ============================================================================
// 27. newsletter_settings
// ============================================================================
export const newsletterSettings = pgTable("newsletter_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  branding: jsonb("branding").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  footer: jsonb("footer").notNull().default({}),
  sender: jsonb("sender").notNull().default({}),
  template: text("template").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 28. newsletter_subscribers
// ============================================================================
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    businessName: text("business_name"),
    consentGivenAt: timestamp("consent_given_at", { withTimezone: true, mode: "string" }),
    consentIpAddress: text("consent_ip_address"),
    consentUserAgent: text("consent_user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    industry: text("industry"),
    lastName: text("last_name"),
    onboarded: boolean("onboarded"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true, mode: "string" }),
    referrer: text("referrer"),
    source: text("source"),
    unsubscribed: boolean("unsubscribed").notNull().default(false),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    verificationToken: text("verification_token"),
    verificationTokenExpiresAt: timestamp("verification_token_expires_at", {
      withTimezone: true,
      mode: "string",
    }),
    verified: boolean("verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    // Indexes on filter columns used in dashboard count queries and subscriber lookups
    index("newsletter_subscribers_verified_idx").on(table.verified),
    index("newsletter_subscribers_tenant_email_idx").on(table.tenantId, table.email),
    index("newsletter_subscribers_unsubscribed_idx").on(table.unsubscribed),
  ],
);

// ============================================================================
// 29. oauth_states
// ============================================================================
export const oauthStates = pgTable("oauth_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  provider: text("provider").notNull(),
  returnUrl: text("return_url"),
  stateToken: text("state_token").notNull().unique(),
  userId: uuid("user_id").notNull(),
});

// ============================================================================
// 30. outreach_blocklist
// ============================================================================
export const outreachBlocklist = pgTable("outreach_blocklist", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  email: text("email").notNull(),
  reason: text("reason"),
});

// ============================================================================
// 31. outreach_campaign_senders (composite primary key)
// ============================================================================
export const outreachCampaignSenders = pgTable(
  "outreach_campaign_senders",
  {
    campaignId: uuid("campaign_id").notNull(),
    senderId: uuid("sender_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.campaignId, table.senderId] })],
);

// ============================================================================
// 32. outreach_campaigns
// ============================================================================
export const outreachCampaigns = pgTable("outreach_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  bccRecipients: text("bcc_recipients").array(),
  ccRecipients: text("cc_recipients").array(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  description: text("description"),
  email2Delay: integer("email_2_delay"),
  email3Delay: integer("email_3_delay"),
  email1Template: text("email_1_template").notNull().default("{{email_1_body}}"),
  email2Template: text("email_2_template").notNull().default("{{email_2_body}}"),
  email3Template: text("email_3_template").notNull().default("{{email_3_body}}"),
  email1SubjectTemplate: text("email_1_subject_template"),
  email2SubjectTemplate: text("email_2_subject_template"),
  email3SubjectTemplate: text("email_3_subject_template"),
  endDate: timestamp("end_date", { withTimezone: true, mode: "string" }),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  insertUnsubscribeHeader: boolean("insert_unsubscribe_header"),
  maxNewLeadsPerDay: integer("max_new_leads_per_day"),
  minSendIntervalMinutes: integer("min_send_interval_minutes"),
  name: text("name").notNull(),
  ownerId: uuid("owner_id"),
  randomSendIntervalMinutes: integer("random_send_interval_minutes"),
  startDate: timestamp("start_date", { withTimezone: true, mode: "string" }),
  status: text("status"),
  stopCompanyOnReply: boolean("stop_company_on_reply"),
  stopOnAutoReply: boolean("stop_on_auto_reply"),
  tags: text("tags").array(),
  testMode: boolean("test_mode"),
  textOnly: boolean("text_only"),
  textOnlyFirst: boolean("text_only_first"),
  totalBounced: integer("total_bounced"),
  totalClicked: integer("total_clicked"),
  totalContacts: integer("total_contacts"),
  totalDelivered: integer("total_delivered"),
  totalOpened: integer("total_opened"),
  totalReplied: integer("total_replied"),
  totalSent: integer("total_sent"),
  trackClicks: boolean("track_clicks"),
  trackOpens: boolean("track_opens"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

// ============================================================================
// 33. outreach_contacts
// ============================================================================
export const outreachContacts = pgTable("outreach_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  addedToCampaignAt: timestamp("added_to_campaign_at", { withTimezone: true, mode: "string" }),
  autoReplyDetected: boolean("auto_reply_detected"),
  autoReplyDetectedAt: timestamp("auto_reply_detected_at", { withTimezone: true, mode: "string" }),
  bounceCount: integer("bounce_count"),
  bouncedAt: timestamp("bounced_at", { withTimezone: true, mode: "string" }),
  campaignId: uuid("campaign_id"),
  company: text("company"),
  companyRevenue: real("company_revenue"),
  companySize: text("company_size"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  currentStep: integer("current_step"),
  customFields: jsonb("custom_fields").notNull().default({}),
  email: text("email").notNull(),
  email1Body: text("email_1_body").notNull(),
  email1MessageId: text("email_1_message_id"),
  email1ResendId: text("email_1_resend_id"),
  email1SentAt: timestamp("email_1_sent_at", { withTimezone: true, mode: "string" }),
  email1Subject: text("email_1_subject").notNull(),
  email2Body: text("email_2_body").notNull(),
  email2ResendId: text("email_2_resend_id"),
  email2SentAt: timestamp("email_2_sent_at", { withTimezone: true, mode: "string" }),
  email2Subject: text("email_2_subject"),
  email3Body: text("email_3_body").notNull(),
  email3ResendId: text("email_3_resend_id"),
  email3SentAt: timestamp("email_3_sent_at", { withTimezone: true, mode: "string" }),
  email3Subject: text("email_3_subject").notNull(),
  emailProvider: text("email_provider"),
  emailSecurityGateway: text("email_security_gateway"),
  firstName: text("first_name"),
  foundedYear: integer("founded_year"),
  industry: text("industry"),
  jobTitle: text("job_title"),
  lastBounceType: text("last_bounce_type"),
  lastName: text("last_name"),
  linkedinUrl: text("linkedin_url"),
  location: text("location"),
  nextSendAt: timestamp("next_send_at", { withTimezone: true, mode: "string" }),
  optOut: boolean("opt_out"),
  phone: text("phone"),
  repliedAt: timestamp("replied_at", { withTimezone: true, mode: "string" }),
  researchReport: text("research_report"),
  securityLevel: text("security_level"),
  securityTier: text("security_tier"),
  senderAccountId: uuid("sender_account_id"),
  seniority: text("seniority"),
  status: text("status"),
  timezone: text("timezone"),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  websiteUrl: text("website_url"),
});

// ============================================================================
// 34. outreach_email_events
// ============================================================================
export const outreachEmailEvents = pgTable("outreach_email_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  bounceMessage: text("bounce_message"),
  bounceType: text("bounce_type"),
  contactId: uuid("contact_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  emailNumber: integer("email_number").notNull(),
  eventType: text("event_type").notNull(),
  ipAddress: text("ip_address"),
  linkUrl: text("link_url"),
  resendEmailId: text("resend_email_id"),
  svixId: text("svix_id"),
  userAgent: text("user_agent"),
});

// ============================================================================
// 35. outreach_replies
// ============================================================================
export const outreachReplies = pgTable(
  "outreach_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aiSuggestedReply: text("ai_suggested_reply"),
    aiSummary: text("ai_summary"),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    campaignId: uuid("campaign_id").notNull(),
    contactId: uuid("contact_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    crmContactId: uuid("crm_contact_id"),
    crmDealId: uuid("crm_deal_id"),
    fromEmail: text("from_email").notNull(),
    inboundMessageId: text("inbound_message_id"),
    intent: text("intent"),
    isArchived: boolean("is_archived").notNull().default(false),
    isRead: boolean("is_read").notNull().default(false),
    pushedToCrmAt: timestamp("pushed_to_crm_at", { withTimezone: true, mode: "string" }),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    replyBody: text("reply_body"),
    replySenderEmail: text("reply_sender_email"),
    replySentAt: timestamp("reply_sent_at", { withTimezone: true, mode: "string" }),
    sentiment: text("sentiment"),
    subject: text("subject"),
  },
  (table) => [
    index("outreach_replies_sentiment_idx").on(table.sentiment),
    index("outreach_replies_received_at_idx").on(table.receivedAt),
    uniqueIndex("outreach_replies_inbound_message_id_unique")
      .on(table.inboundMessageId)
      .where(sql`inbound_message_id IS NOT NULL`),
  ],
);

// ============================================================================
// 36. outreach_schedules
// ============================================================================
export const outreachSchedules = pgTable("outreach_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  isActive: boolean("is_active").notNull().default(false),
  name: text("name").notNull(),
  sendDays: text("send_days")
    .array()
    .notNull()
    .default(sql`ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']::text[]`),
  sendWindowEnd: text("send_window_end").notNull().default("17:00"),
  sendWindowStart: text("send_window_start").notNull().default("09:00"),
  timezone: text("timezone").notNull().default("Australia/Perth"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

// ============================================================================
// 37. outreach_sender_accounts
// ============================================================================
export const outreachSenderAccounts = pgTable("outreach_sender_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  dailyLimit: integer("daily_limit"),
  domain: text("domain").notNull(),
  email: text("email").notNull(),
  emailsSentToday: integer("emails_sent_today"),
  isActive: boolean("is_active"),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true, mode: "string" }),
  name: text("name").notNull(),
  signatureHtml: text("signature_html"),
  signaturePlainText: text("signature_plain_text"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

// ============================================================================
// 38. partners
// ============================================================================
export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  displayOrder: integer("display_order"),
  logoUrl: text("logo_url").notNull(),
  name: text("name").notNull(),
  published: boolean("published"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  websiteUrl: text("website_url"),
});

// ============================================================================
// 39. password_reset_tokens
// ============================================================================
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  tokenHash: text("token_hash").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true, mode: "string" }),
  userId: uuid("user_id").notNull(),
});

// ============================================================================
// 40. pipelines
// ============================================================================
export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  icon: text("icon"),
  isActive: boolean("is_active"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

// ============================================================================
// 41. stages
// ============================================================================
export const stages = pgTable("stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  isPositive: boolean("is_positive"),
  isTerminal: boolean("is_terminal"),
  name: text("name").notNull(),
  pipelineId: uuid("pipeline_id").notNull(),
  slug: text("slug").notNull(),
});

// ============================================================================
// 43. crm_sync_queue
// ============================================================================
export const crmSyncQueue = pgTable("crm_sync_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  operationType: text("operation_type").notNull(),
  payload: jsonb("payload").notNull(),
  submissionId: uuid("submission_id"),
  contactId: uuid("contact_id"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  lastError: text("last_error"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
});

// ============================================================================
// 43. site_settings
// ============================================================================
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("default"),
  businessName: text("business_name"),
  abn: text("abn"),
  phone: text("phone"),
  email: text("email"),
  logoUrl: text("logo_url"),
  addressStreet: text("address_street"),
  addressCity: text("address_city"),
  addressState: text("address_state"),
  addressPostcode: text("address_postcode"),
  addressCountry: text("address_country"),
  website: text("website"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// 42. notifications
// ============================================================================
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: text("type").notNull(),
    priority: text("priority").notNull().default("INFO"),
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
    relatedId: text("related_id"),
    relatedType: text("related_type"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_is_read_idx").on(t.isRead),
  ],
);

// ============================================================================
// Omnichannel persistence foundation (additive; legacy contacts remain unchanged)
// ============================================================================
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("locations_tenant_id_unique_idx").on(table.tenantId, table.id),
    uniqueIndex("locations_tenant_slug_unique_idx").on(table.tenantId, table.slug),
  ],
);

export const tenantMemberships = pgTable(
  "tenant_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id),
    role: text("role").notNull().default("agent"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_memberships_tenant_user_unique_idx").on(table.tenantId, table.userId),
  ],
);

export const omnichannelContacts = pgTable(
  "omnichannel_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    displayName: text("display_name"),
    status: text("status").notNull().default("active"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("omnichannel_contacts_tenant_id_unique_idx").on(table.tenantId, table.id),
  ],
);

export const contactIdentities = pgTable(
  "contact_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    contactId: uuid("contact_id").notNull(),
    type: text("type").notNull(),
    value: text("value").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    provenance: text("provenance").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.contactId],
      foreignColumns: [omnichannelContacts.tenantId, omnichannelContacts.id],
      name: "contact_identities_tenant_contact_fk",
    }),
    index("contact_identities_tenant_contact_idx").on(table.tenantId, table.contactId),
    uniqueIndex("contact_identities_verified_unique_idx")
      .on(table.tenantId, table.type, table.normalizedValue)
      .where(sql`${table.verificationStatus} = 'verified'`),
  ],
);

export const channelAccounts = pgTable(
  "channel_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    locationId: uuid("location_id").references(() => locations.id),
    provider: text("provider").notNull(),
    externalAccountId: text("external_account_id").notNull(),
    displayName: text("display_name").notNull(),
    capabilities: jsonb("capabilities").notNull().default({}),
    status: text("status").notNull().default("active"),
    secretReference: text("secret_reference"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("channel_accounts_tenant_id_unique_idx").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.locationId],
      foreignColumns: [locations.tenantId, locations.id],
      name: "channel_accounts_tenant_location_fk",
    }),
    uniqueIndex("channel_accounts_tenant_provider_external_unique_idx").on(
      table.tenantId,
      table.provider,
      table.externalAccountId,
    ),
  ],
);

export const conversationThreads = pgTable(
  "conversation_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    locationId: uuid("location_id").references(() => locations.id),
    contactId: uuid("contact_id").notNull(),
    channel: text("channel").notNull(),
    state: text("state").notNull().default("open"),
    subject: text("subject"),
    lastEventAt: timestamp("last_event_at", { withTimezone: true, mode: "string" }),
    /** Inbound messages since the team last opened the thread (inbox "Unread"). */
    unreadCount: integer("unread_count").notNull().default(0),
    /** Team-wide star, like the inbox "Starred" filter in GoHighLevel. */
    starred: boolean("starred").notNull().default(false),
    /** First part of the latest message, for the inbox list. */
    lastMessagePreview: text("last_message_preview"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("conversation_threads_tenant_id_contact_id_unique_idx").on(
      table.tenantId,
      table.id,
      table.contactId,
    ),
    // One open thread per contact per channel, so two inbound texts racing never split a chat.
    uniqueIndex("conversation_threads_open_contact_channel_unique_idx")
      .on(table.tenantId, table.contactId, table.channel)
      .where(sql`${table.state} = 'open'`),
    index("conversation_threads_tenant_last_event_idx").on(table.tenantId, table.lastEventAt),
    check("conversation_threads_unread_count_check", sql`${table.unreadCount} >= 0`),
    foreignKey({
      columns: [table.tenantId, table.locationId],
      foreignColumns: [locations.tenantId, locations.id],
      name: "conversation_threads_tenant_location_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.contactId],
      foreignColumns: [omnichannelContacts.tenantId, omnichannelContacts.id],
      name: "conversation_threads_tenant_contact_fk",
    }),
    index("conversation_threads_tenant_contact_timeline_idx").on(
      table.tenantId,
      table.contactId,
      table.lastEventAt,
    ),
  ],
);

export const communicationEvents = pgTable(
  "communication_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => conversationThreads.id),
    contactId: uuid("contact_id").notNull(),
    sourceChannelAccountId: uuid("source_channel_account_id").references(() => channelAccounts.id),
    channel: text("channel").notNull(),
    kind: text("kind").notNull(),
    direction: text("direction").notNull(),
    actorType: text("actor_type"),
    actorId: uuid("actor_id"),
    bodyText: text("body_text"),
    bodyHtmlSanitized: text("body_html_sanitized"),
    status: text("status").notNull(),
    eventVersion: integer("event_version").notNull().default(1),
    channelData: jsonb("channel_data").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    providerSequence: text("provider_sequence"),
    redactedAt: timestamp("redacted_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("communication_events_tenant_id_unique_idx").on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.threadId, table.contactId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.id,
        conversationThreads.contactId,
      ],
      name: "communication_events_tenant_thread_contact_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.sourceChannelAccountId],
      foreignColumns: [channelAccounts.tenantId, channelAccounts.id],
      name: "communication_events_tenant_source_channel_account_fk",
    }),
    index("communication_events_tenant_thread_timeline_idx").on(
      table.tenantId,
      table.threadId,
      table.occurredAt,
      table.id,
    ),
    index("communication_events_tenant_contact_timeline_idx").on(
      table.tenantId,
      table.contactId,
      table.occurredAt,
      table.id,
    ),
  ],
);

export const externalRecordMappings = pgTable(
  "external_record_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    channelAccountId: uuid("channel_account_id")
      .notNull()
      .references(() => channelAccounts.id),
    objectType: text("object_type").notNull(),
    canonicalId: uuid("canonical_id").notNull(),
    externalId: text("external_id").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.channelAccountId],
      foreignColumns: [channelAccounts.tenantId, channelAccounts.id],
      name: "external_record_mappings_tenant_channel_account_fk",
    }),
    uniqueIndex("external_record_mappings_account_external_unique_idx").on(
      table.channelAccountId,
      table.objectType,
      table.externalId,
    ),
    uniqueIndex("external_record_mappings_account_canonical_unique_idx").on(
      table.channelAccountId,
      table.objectType,
      table.canonicalId,
    ),
    index("external_record_mappings_tenant_canonical_idx").on(table.tenantId, table.canonicalId),
  ],
);

export const providerWebhookEvents = pgTable(
  "provider_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    channelAccountId: uuid("channel_account_id")
      .notNull()
      .references(() => channelAccounts.id),
    provider: text("provider").notNull(),
    externalEventId: text("external_event_id"),
    payloadHash: text("payload_hash"),
    signatureVerified: boolean("signature_verified").notNull().default(false),
    processingStatus: text("processing_status").notNull().default("received"),
    payload: jsonb("payload"),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
    error: text("error"),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.channelAccountId],
      foreignColumns: [channelAccounts.tenantId, channelAccounts.id],
      name: "provider_webhook_events_tenant_channel_account_fk",
    }),
    uniqueIndex("provider_webhook_events_account_external_unique_idx")
      .on(table.channelAccountId, table.externalEventId)
      .where(sql`${table.externalEventId} IS NOT NULL`),
    uniqueIndex("provider_webhook_events_account_hash_unique_idx")
      .on(table.channelAccountId, table.payloadHash)
      .where(sql`${table.externalEventId} IS NULL AND ${table.payloadHash} IS NOT NULL`),
    index("provider_webhook_events_tenant_status_idx").on(table.tenantId, table.processingStatus),
  ],
);

export const outboundOperations = pgTable(
  "outbound_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    channelAccountId: uuid("channel_account_id")
      .notNull()
      .references(() => channelAccounts.id),
    eventId: uuid("event_id").references(() => communicationEvents.id),
    operationType: text("operation_type").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("pending"),
    payload: jsonb("payload").notNull().default({}),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: "string" }),
    externalReference: text("external_reference"),
    terminalError: text("terminal_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.channelAccountId],
      foreignColumns: [channelAccounts.tenantId, channelAccounts.id],
      name: "outbound_operations_tenant_channel_account_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.eventId],
      foreignColumns: [communicationEvents.tenantId, communicationEvents.id],
      name: "outbound_operations_tenant_event_fk",
    }),
    uniqueIndex("outbound_operations_account_idempotency_unique_idx").on(
      table.channelAccountId,
      table.idempotencyKey,
    ),
    index("outbound_operations_tenant_status_retry_idx").on(
      table.tenantId,
      table.status,
      table.nextAttemptAt,
    ),
  ],
);

// ============================================================================
// 43. testimonials
// ============================================================================
export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  avatarSrc: text("avatar_src").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  displayOrder: integer("display_order").notNull().default(0),
  googleReviewId: text("google_review_id").unique(),
  name: text("name").notNull(),
  published: boolean("published").notNull().default(false),
  quote: text("quote").notNull(),
  rating: integer("rating").notNull().default(5),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ============================================================================
// Revisioned graph automation (additive; linear automation remains unchanged)
// ============================================================================
export const automationWorkflowRevisions = pgTable(
  "automation_workflow_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => automationFlows.id),
    version: integer("version").notNull(),
    lifecycle: text("lifecycle").notNull().default("draft"),
    graphHash: text("graph_hash").notNull(),
    optimisticToken: uuid("optimistic_token").notNull().defaultRandom(),
    authorId: uuid("author_id").references(() => adminUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    supersededAt: timestamp("superseded_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("automation_revisions_tenant_flow_version_unique_idx").on(
      table.tenantId,
      table.flowId,
      table.version,
    ),
    uniqueIndex("automation_revisions_one_draft_idx")
      .on(table.tenantId, table.flowId)
      .where(sql`${table.lifecycle} = 'draft'`),
    index("automation_revisions_tenant_flow_lifecycle_idx").on(
      table.tenantId,
      table.flowId,
      table.lifecycle,
    ),
  ],
);

export const automationWorkflowNodes = pgTable(
  "automation_workflow_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => automationWorkflowRevisions.id),
    nodeKey: text("node_key").notNull(),
    nodeType: text("node_type").notNull(),
    name: text("name").notNull(),
    positionX: integer("position_x").notNull(),
    positionY: integer("position_y").notNull(),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_nodes_tenant_revision_key_unique_idx").on(
      table.tenantId,
      table.revisionId,
      table.nodeKey,
    ),
    index("automation_nodes_tenant_revision_idx").on(table.tenantId, table.revisionId),
  ],
);

export const automationWorkflowEdges = pgTable(
  "automation_workflow_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => automationWorkflowRevisions.id),
    sourceNodeKey: text("source_node_key").notNull(),
    targetNodeKey: text("target_node_key").notNull(),
    sourceHandle: text("source_handle").notNull().default("default"),
    edgeOrder: integer("edge_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("automation_edges_no_self_edge", sql`${table.sourceNodeKey} <> ${table.targetNodeKey}`),
    uniqueIndex("automation_edges_tenant_revision_path_unique_idx").on(
      table.tenantId,
      table.revisionId,
      table.sourceNodeKey,
      table.sourceHandle,
      table.targetNodeKey,
    ),
    index("automation_edges_tenant_revision_source_idx").on(
      table.tenantId,
      table.revisionId,
      table.sourceNodeKey,
      table.edgeOrder,
    ),
  ],
);

export const automationNodeRuns = pgTable(
  "automation_node_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => automationEnrollments.id),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => automationWorkflowRevisions.id),
    nodeKey: text("node_key").notNull(),
    attempt: integer("attempt").notNull().default(1),
    status: text("status").notNull().default("pending"),
    selectedOutput: text("selected_output"),
    outputData: jsonb("output_data"),
    errorData: jsonb("error_data"),
    operationKey: text("operation_key").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    settledAt: timestamp("settled_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_node_runs_tenant_operation_unique_idx").on(
      table.tenantId,
      table.operationKey,
    ),
    uniqueIndex("automation_node_runs_enrollment_node_attempt_unique_idx").on(
      table.enrollmentId,
      table.nodeKey,
      table.attempt,
    ),
    index("automation_node_runs_tenant_enrollment_status_idx").on(
      table.tenantId,
      table.enrollmentId,
      table.status,
    ),
  ],
);

export const automationDispatchOutbox = pgTable(
  "automation_dispatch_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => automationEnrollments.id),
    runId: uuid("run_id").references(() => automationNodeRuns.id),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => automationWorkflowRevisions.id),
    successorNodeKey: text("successor_node_key").notNull(),
    operationKey: text("operation_key").notNull(),
    dedupKey: text("dedup_key").notNull(),
    availableAt: timestamp("available_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    attempts: integer("attempts").notNull().default(0),
    terminalError: text("terminal_error"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_outbox_tenant_dedup_unique_idx").on(table.tenantId, table.dedupKey),
    index("automation_outbox_tenant_publish_idx").on(
      table.tenantId,
      table.publishedAt,
      table.availableAt,
    ),
  ],
);

export const automationCallTasks = pgTable(
  "automation_call_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => automationEnrollments.id),
    sourceRunId: uuid("source_run_id")
      .notNull()
      .references(() => automationNodeRuns.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    dealId: uuid("deal_id").references(() => deals.id),
    assignedToUserId: uuid("assigned_to_user_id").references(() => adminUsers.id),
    script: text("script").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }).notNull(),
    status: text("status").notNull().default("open"),
    outcome: text("outcome"),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_call_tasks_tenant_run_unique_idx").on(
      table.tenantId,
      table.sourceRunId,
    ),
    index("automation_call_tasks_tenant_status_due_idx").on(
      table.tenantId,
      table.status,
      table.dueAt,
    ),
  ],
);

export const automationWorkflowTemplates = pgTable(
  "automation_workflow_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    scope: text("scope").notNull().default("tenant"),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    version: integer("version").notNull().default(1),
    graphSnapshot: jsonb("graph_snapshot").notNull(),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_templates_scope_tenant_name_version_unique_idx").on(
      table.scope,
      table.tenantId,
      table.name,
      table.version,
    ),
    index("automation_templates_tenant_category_idx").on(table.tenantId, table.category),
  ],
);

export const automationWebhookEndpoints = pgTable(
  "automation_webhook_endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => automationFlows.id),
    nodeKey: text("node_key").notNull(),
    publicHookId: text("public_hook_id").notNull().unique(),
    secretReference: text("secret_reference").notNull(),
    signingSecretHash: text("signing_secret_hash").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_webhook_endpoints_tenant_flow_node_unique_idx").on(
      table.tenantId,
      table.flowId,
      table.nodeKey,
    ),
    index("automation_webhook_endpoints_tenant_status_idx").on(table.tenantId, table.status),
  ],
);

export const automationWebhookEvents = pgTable(
  "automation_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => automationWebhookEndpoints.id),
    externalEventId: text("external_event_id"),
    bodyHash: text("body_hash").notNull(),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true, mode: "string" }).notNull(),
    payload: jsonb("payload").notNull(),
    signatureStatus: text("signature_status").notNull(),
    processingStatus: text("processing_status").notNull().default("received"),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_webhook_events_endpoint_external_unique_idx")
      .on(table.endpointId, table.externalEventId)
      .where(sql`${table.externalEventId} IS NOT NULL`),
    uniqueIndex("automation_webhook_events_endpoint_hash_unique_idx").on(
      table.endpointId,
      table.bodyHash,
    ),
    index("automation_webhook_events_tenant_status_idx").on(table.tenantId, table.processingStatus),
  ],
);

export const automationActionOperations = pgTable(
  "automation_action_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    runId: uuid("run_id")
      .notNull()
      .references(() => automationNodeRuns.id),
    actionId: text("action_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    state: text("state").notNull().default("pending"),
    providerReference: text("provider_reference"),
    responseMetadata: jsonb("response_metadata"),
    errorMetadata: jsonb("error_metadata"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_action_operations_tenant_idempotency_unique_idx").on(
      table.tenantId,
      table.idempotencyKey,
    ),
    index("automation_action_operations_tenant_state_idx").on(table.tenantId, table.state),
  ],
);

export const automationTenantAssignmentAudits = pgTable(
  "automation_tenant_assignment_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    manifestHash: text("manifest_hash").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => adminUsers.id),
    resourceCounts: jsonb("resource_counts").notNull(),
    outcome: text("outcome").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("automation_tenant_assignment_manifest_outcome_unique_idx").on(
      table.manifestHash,
      table.outcome,
    ),
  ],
);

// ============================================================================
// Gap Goblins: Lead Finder (Milestone 1)
// Every table is tenant-scoped: tenant_id NOT NULL + FK, tenant-leading indexes.
// ============================================================================

export const leadScanStatuses = ["queued", "running", "completed", "failed", "cancelled"] as const;
export type LeadScanStatus = (typeof leadScanStatuses)[number];

/**
 * A named area a tenant sells into: drawn map areas and/or ZIP codes (with the Census ZIP
 * outline captured when each ZIP was added). Shapes are validated in
 * lib/lead-finder/territories/geometry.ts before they are stored.
 */
export const leadTerritories = pgTable(
  "lead_territories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    /** GeoPolygon[] drawn on the map. */
    polygons: jsonb("polygons").notNull().default([]),
    /** TerritoryZip[]: ZIP code, outline source and Census outline. */
    zips: jsonb("zips").notNull().default([]),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("lead_territories_tenant_id_unique_idx").on(table.tenantId, table.id),
    uniqueIndex("lead_territories_tenant_name_unique_idx").on(table.tenantId, table.name),
    check("lead_territories_name_check", sql`length(${table.name}) between 1 and 120`),
  ],
);

export const leadScans = pgTable(
  "lead_scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    niche: text("niche").notNull(),
    location: text("location").notNull(),
    maxResults: integer("max_results").notNull().default(50),
    source: text("source").notNull(),
    sourceFileKey: text("source_file_key"),
    sourceFileName: text("source_file_name"),
    status: text("status").$type<LeadScanStatus>().notNull().default("queued"),
    foundCount: integer("found_count").notNull().default(0),
    processedCount: integer("processed_count").notNull().default(0),
    createdCount: integer("created_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    skippedClosedCount: integer("skipped_closed_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    /** Optional territory the scan targets; businesses known to be outside it are skipped. */
    territoryId: uuid("territory_id"),
    /** The territory's name when the scan was created, kept if the territory is deleted. */
    territoryName: text("territory_name"),
    skippedOutsideTerritoryCount: integer("skipped_outside_territory_count").notNull().default(0),
    errorMessage: text("error_message"),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("lead_scans_tenant_id_unique_idx").on(table.tenantId, table.id),
    index("lead_scans_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("lead_scans_tenant_status_idx").on(table.tenantId, table.status),
    index("lead_scans_tenant_territory_idx").on(table.tenantId, table.territoryId),
    // Same-tenant territory only. The migration sets ON DELETE SET NULL (territory_id) so
    // deleting a territory keeps the scan (and its tenant_id); Drizzle cannot express that list.
    foreignKey({
      columns: [table.tenantId, table.territoryId],
      foreignColumns: [leadTerritories.tenantId, leadTerritories.id],
      name: "lead_scans_tenant_territory_fk",
    }),
    check(
      "lead_scans_status_check",
      sql`${table.status} in ('queued', 'running', 'completed', 'failed', 'cancelled')`,
    ),
    check("lead_scans_max_results_check", sql`${table.maxResults} between 1 and 1000`),
  ],
);

export const leadBusinesses = pgTable(
  "lead_businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    kgmid: text("kgmid"),
    placeId: text("place_id"),
    cid: text("cid"),
    name: text("name").notNull(),
    mainCategory: text("main_category"),
    address: text("address"),
    phoneRaw: text("phone_raw"),
    phoneE164: text("phone_e164"),
    website: text("website"),
    gbpUrl: text("gbp_url"),
    rating: real("rating"),
    reviewCount: integer("review_count"),
    imageCount: integer("image_count"),
    canClaim: boolean("can_claim"),
    hasDescription: boolean("has_description"),
    hasHours: boolean("has_hours"),
    ownerPostsCount: integer("owner_posts_count"),
    isPermanentlyClosed: boolean("is_permanently_closed"),
    isTemporarilyClosed: boolean("is_temporarily_closed"),
    email: text("email"),
    rawPayload: jsonb("raw_payload"),
    /** Map point from the source or the Census geocoder; null when unknown. */
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    /** 5-digit ZIP from the source or the address; null when unknown. */
    postalCode: text("postal_code"),
    /** Where the map point came from: "source" or "census-geocoder". */
    locationSource: text("location_source").$type<"source" | "census-geocoder">(),
    /** Last Census geocode attempt, so a failed lookup is not repeated on every scan. */
    geocodeAttemptedAt: timestamp("geocode_attempted_at", { withTimezone: true, mode: "string" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
    firstSeenScanId: uuid("first_seen_scan_id").references(() => leadScans.id),
    lastSeenScanId: uuid("last_seen_scan_id").references(() => leadScans.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("lead_businesses_tenant_id_unique_idx").on(table.tenantId, table.id),
    uniqueIndex("lead_businesses_tenant_kgmid_unique_idx")
      .on(table.tenantId, table.kgmid)
      .where(sql`${table.kgmid} is not null`),
    index("lead_businesses_tenant_place_id_idx").on(table.tenantId, table.placeId),
    index("lead_businesses_tenant_cid_idx").on(table.tenantId, table.cid),
    index("lead_businesses_tenant_phone_idx").on(table.tenantId, table.phoneE164),
    index("lead_businesses_tenant_gbp_url_idx").on(table.tenantId, table.gbpUrl),
    index("lead_businesses_tenant_contact_idx").on(table.tenantId, table.contactId),
    index("lead_businesses_tenant_postal_code_idx").on(table.tenantId, table.postalCode),
    check(
      "lead_businesses_location_check",
      sql`(${table.latitude} is null) = (${table.longitude} is null) and (${table.latitude} is null or (${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180))`,
    ),
    check(
      "lead_businesses_postal_code_check",
      sql`${table.postalCode} is null or ${table.postalCode} ~ '^[0-9]{5}$'`,
    ),
    check(
      "lead_businesses_location_source_check",
      sql`${table.locationSource} is null or ${table.locationSource} in ('source', 'census-geocoder')`,
    ),
  ],
);

export const leadScanResults = pgTable(
  "lead_scan_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => leadScans.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => leadBusinesses.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    flags: jsonb("flags").notNull(),
    rubricVersion: text("rubric_version").notNull(),
    /** Null when the scan had no territory; "inside" or "unknown" (outside ones are skipped). */
    territoryStatus: text("territory_status").$type<"inside" | "outside" | "unknown">(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("lead_scan_results_tenant_id_unique_idx").on(table.tenantId, table.id),
    check(
      "lead_scan_results_territory_status_check",
      sql`${table.territoryStatus} is null or ${table.territoryStatus} in ('inside', 'outside', 'unknown')`,
    ),
    uniqueIndex("lead_scan_results_scan_business_unique_idx").on(table.scanId, table.businessId),
    index("lead_scan_results_tenant_scan_score_idx").on(table.tenantId, table.scanId, table.score),
    index("lead_scan_results_tenant_business_idx").on(
      table.tenantId,
      table.businessId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.tenantId, table.scanId],
      foreignColumns: [leadScans.tenantId, leadScans.id],
      name: "lead_scan_results_tenant_scan_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.businessId],
      foreignColumns: [leadBusinesses.tenantId, leadBusinesses.id],
      name: "lead_scan_results_tenant_business_fk",
    }),
    check("lead_scan_results_score_check", sql`${table.score} between 0 and 100`),
  ],
);

export const tenantBranding = pgTable(
  "tenant_branding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    companyName: text("company_name"),
    logoStorageKey: text("logo_storage_key"),
    primaryColor: text("primary_color"),
    accentColor: text("accent_color"),
    ctaHeadline: text("cta_headline"),
    ctaBody: text("cta_body"),
    ctaUrl: text("cta_url"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    website: text("website"),
    physicalAddress: text("physical_address"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("tenant_branding_tenant_unique_idx").on(table.tenantId)],
);

export const leadReports = pgTable(
  "lead_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => leadBusinesses.id, { onDelete: "cascade" }),
    scanResultId: uuid("scan_result_id")
      .notNull()
      .references(() => leadScanResults.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    rubricVersion: text("rubric_version").notNull(),
    generatedBy: uuid("generated_by").references(() => adminUsers.id),
    generatedAt: timestamp("generated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("lead_reports_tenant_business_idx").on(
      table.tenantId,
      table.businessId,
      table.generatedAt,
    ),
    foreignKey({
      columns: [table.tenantId, table.businessId],
      foreignColumns: [leadBusinesses.tenantId, leadBusinesses.id],
      name: "lead_reports_tenant_business_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.scanResultId],
      foreignColumns: [leadScanResults.tenantId, leadScanResults.id],
      name: "lead_reports_tenant_scan_result_fk",
    }),
    check(
      "lead_reports_storage_key_tenant_check",
      sql`${table.storageKey} like 'tenants/' || ${table.tenantId}::text || '/%'`,
    ),
  ],
);
