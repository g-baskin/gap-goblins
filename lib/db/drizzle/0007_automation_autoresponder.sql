-- Automation autoresponder foundation.
-- Adds native linear email automation flows, enrollments, sends, and append-only events.

CREATE TABLE "automation_flows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "trigger_type" text NOT NULL,
  "audience_filter" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "from_name" text,
  "from_email" text,
  "reply_to" text,
  "track_opens" boolean DEFAULT true NOT NULL,
  "track_clicks" boolean DEFAULT true NOT NULL,
  "stop_on_unsubscribe" boolean DEFAULT true NOT NULL,
  "stop_on_bounce" boolean DEFAULT true NOT NULL,
  "stop_on_complaint" boolean DEFAULT true NOT NULL,
  "conversion_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "automation_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "flow_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "step_type" text NOT NULL,
  "name" text NOT NULL,
  "subject" text,
  "body_html" text,
  "body_text" text,
  "delay_amount" integer DEFAULT 0 NOT NULL,
  "delay_unit" text DEFAULT 'minutes' NOT NULL,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "automation_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "flow_id" uuid NOT NULL,
  "subscriber_id" uuid,
  "contact_id" uuid,
  "email" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "current_step_id" uuid,
  "current_step_order" integer DEFAULT 0 NOT NULL,
  "engagement_stage" text DEFAULT 'enrolled' NOT NULL,
  "engagement_score" integer DEFAULT 0 NOT NULL,
  "opened_at" timestamp with time zone,
  "clicked_at" timestamp with time zone,
  "converted_at" timestamp with time zone,
  "stopped_at" timestamp with time zone,
  "stop_reason" text,
  "next_step_at" timestamp with time zone,
  "last_event_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "automation_sends" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "flow_id" uuid NOT NULL,
  "step_id" uuid NOT NULL,
  "enrollment_id" uuid NOT NULL,
  "subscriber_id" uuid,
  "contact_id" uuid,
  "to_email" text NOT NULL,
  "subject" text NOT NULL,
  "from_email" text,
  "from_name" text,
  "reply_to" text,
  "status" text DEFAULT 'queued' NOT NULL,
  "provider_message_id" text,
  "error_message" text,
  "scheduled_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "opened_at" timestamp with time zone,
  "first_click_at" timestamp with time zone,
  "bounced_at" timestamp with time zone,
  "complained_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "automation_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "flow_id" uuid,
  "step_id" uuid,
  "enrollment_id" uuid,
  "send_id" uuid,
  "subscriber_id" uuid,
  "contact_id" uuid,
  "event_type" text NOT NULL,
  "provider_message_id" text,
  "svix_id" text,
  "link_url" text,
  "ip_address" text,
  "user_agent" text,
  "event_data" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "automation_flows_status_idx" ON "automation_flows" ("status");
CREATE INDEX "automation_flows_trigger_type_idx" ON "automation_flows" ("trigger_type");

CREATE INDEX "automation_steps_flow_id_idx" ON "automation_steps" ("flow_id");
CREATE UNIQUE INDEX "automation_steps_flow_order_unique_idx" ON "automation_steps" ("flow_id", "step_order");

CREATE INDEX "automation_enrollments_flow_id_idx" ON "automation_enrollments" ("flow_id");
CREATE INDEX "automation_enrollments_subscriber_id_idx" ON "automation_enrollments" ("subscriber_id");
CREATE INDEX "automation_enrollments_contact_id_idx" ON "automation_enrollments" ("contact_id");
CREATE INDEX "automation_enrollments_status_next_step_idx" ON "automation_enrollments" ("status", "next_step_at");
CREATE UNIQUE INDEX "automation_enrollments_flow_subscriber_unique_idx"
  ON "automation_enrollments" ("flow_id", "subscriber_id")
  WHERE "subscriber_id" IS NOT NULL;
CREATE UNIQUE INDEX "automation_enrollments_flow_contact_unique_idx"
  ON "automation_enrollments" ("flow_id", "contact_id")
  WHERE "contact_id" IS NOT NULL;

CREATE INDEX "automation_sends_enrollment_id_idx" ON "automation_sends" ("enrollment_id");
CREATE INDEX "automation_sends_provider_message_id_idx" ON "automation_sends" ("provider_message_id");
CREATE INDEX "automation_sends_status_idx" ON "automation_sends" ("status");
CREATE UNIQUE INDEX "automation_sends_enrollment_step_unique_idx" ON "automation_sends" ("enrollment_id", "step_id");

CREATE INDEX "automation_events_enrollment_id_idx" ON "automation_events" ("enrollment_id");
CREATE INDEX "automation_events_send_id_idx" ON "automation_events" ("send_id");
CREATE INDEX "automation_events_event_type_idx" ON "automation_events" ("event_type");
CREATE UNIQUE INDEX "automation_events_svix_id_unique_idx"
  ON "automation_events" ("svix_id")
  WHERE "svix_id" IS NOT NULL;
