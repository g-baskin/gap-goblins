CREATE TABLE "channel_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid,
	"provider" text NOT NULL,
	"external_account_id" text NOT NULL,
	"display_name" text NOT NULL,
	"capabilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"secret_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"source_channel_account_id" uuid,
	"channel" text NOT NULL,
	"kind" text NOT NULL,
	"direction" text NOT NULL,
	"actor_type" text,
	"actor_id" uuid,
	"body_text" text,
	"body_html_sanitized" text,
	"status" text NOT NULL,
	"event_version" integer DEFAULT 1 NOT NULL,
	"channel_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_sequence" text,
	"redacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"provenance" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid,
	"contact_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"subject" text,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_record_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel_account_id" uuid NOT NULL,
	"object_type" text NOT NULL,
	"canonical_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "omnichannel_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel_account_id" uuid NOT NULL,
	"event_id" uuid,
	"operation_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"external_reference" text,
	"terminal_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel_account_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_event_id" text,
	"payload_hash" text,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"processing_status" text DEFAULT 'received' NOT NULL,
	"payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'agent' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "locations_tenant_id_unique_idx" ON "locations" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "omnichannel_contacts_tenant_id_unique_idx" ON "omnichannel_contacts" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_accounts_tenant_id_unique_idx" ON "channel_accounts" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_threads_tenant_id_contact_id_unique_idx" ON "conversation_threads" USING btree ("tenant_id","id","contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "communication_events_tenant_id_unique_idx" ON "communication_events" USING btree ("tenant_id","id");--> statement-breakpoint
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_tenant_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_source_channel_account_id_channel_accounts_id_fk" FOREIGN KEY ("source_channel_account_id") REFERENCES "public"."channel_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_tenant_thread_contact_fk" FOREIGN KEY ("tenant_id","thread_id","contact_id") REFERENCES "public"."conversation_threads"("tenant_id","id","contact_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_tenant_source_channel_account_fk" FOREIGN KEY ("tenant_id","source_channel_account_id") REFERENCES "public"."channel_accounts"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identities" ADD CONSTRAINT "contact_identities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identities" ADD CONSTRAINT "contact_identities_tenant_contact_fk" FOREIGN KEY ("tenant_id","contact_id") REFERENCES "public"."omnichannel_contacts"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_tenant_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "public"."locations"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_tenant_contact_fk" FOREIGN KEY ("tenant_id","contact_id") REFERENCES "public"."omnichannel_contacts"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_record_mappings" ADD CONSTRAINT "external_record_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_record_mappings" ADD CONSTRAINT "external_record_mappings_channel_account_id_channel_accounts_id_fk" FOREIGN KEY ("channel_account_id") REFERENCES "public"."channel_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_record_mappings" ADD CONSTRAINT "external_record_mappings_tenant_channel_account_fk" FOREIGN KEY ("tenant_id","channel_account_id") REFERENCES "public"."channel_accounts"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omnichannel_contacts" ADD CONSTRAINT "omnichannel_contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_operations" ADD CONSTRAINT "outbound_operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_operations" ADD CONSTRAINT "outbound_operations_channel_account_id_channel_accounts_id_fk" FOREIGN KEY ("channel_account_id") REFERENCES "public"."channel_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_operations" ADD CONSTRAINT "outbound_operations_event_id_communication_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."communication_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_operations" ADD CONSTRAINT "outbound_operations_tenant_channel_account_fk" FOREIGN KEY ("tenant_id","channel_account_id") REFERENCES "public"."channel_accounts"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_operations" ADD CONSTRAINT "outbound_operations_tenant_event_fk" FOREIGN KEY ("tenant_id","event_id") REFERENCES "public"."communication_events"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_webhook_events" ADD CONSTRAINT "provider_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_webhook_events" ADD CONSTRAINT "provider_webhook_events_channel_account_id_channel_accounts_id_fk" FOREIGN KEY ("channel_account_id") REFERENCES "public"."channel_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_webhook_events" ADD CONSTRAINT "provider_webhook_events_tenant_channel_account_fk" FOREIGN KEY ("tenant_id","channel_account_id") REFERENCES "public"."channel_accounts"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channel_accounts_tenant_provider_external_unique_idx" ON "channel_accounts" USING btree ("tenant_id","provider","external_account_id");--> statement-breakpoint
CREATE INDEX "communication_events_tenant_thread_timeline_idx" ON "communication_events" USING btree ("tenant_id","thread_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "communication_events_tenant_contact_timeline_idx" ON "communication_events" USING btree ("tenant_id","contact_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "contact_identities_tenant_contact_idx" ON "contact_identities" USING btree ("tenant_id","contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_identities_verified_unique_idx" ON "contact_identities" USING btree ("tenant_id","type","normalized_value") WHERE "contact_identities"."verification_status" = 'verified';--> statement-breakpoint
CREATE INDEX "conversation_threads_tenant_contact_timeline_idx" ON "conversation_threads" USING btree ("tenant_id","contact_id","last_event_at");--> statement-breakpoint
CREATE UNIQUE INDEX "external_record_mappings_account_external_unique_idx" ON "external_record_mappings" USING btree ("channel_account_id","object_type","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_record_mappings_account_canonical_unique_idx" ON "external_record_mappings" USING btree ("channel_account_id","object_type","canonical_id");--> statement-breakpoint
CREATE INDEX "external_record_mappings_tenant_canonical_idx" ON "external_record_mappings" USING btree ("tenant_id","canonical_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_tenant_slug_unique_idx" ON "locations" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_operations_account_idempotency_unique_idx" ON "outbound_operations" USING btree ("channel_account_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "outbound_operations_tenant_status_retry_idx" ON "outbound_operations" USING btree ("tenant_id","status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_webhook_events_account_external_unique_idx" ON "provider_webhook_events" USING btree ("channel_account_id","external_event_id") WHERE "provider_webhook_events"."external_event_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_webhook_events_account_hash_unique_idx" ON "provider_webhook_events" USING btree ("channel_account_id","payload_hash") WHERE "provider_webhook_events"."external_event_id" IS NULL AND "provider_webhook_events"."payload_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "provider_webhook_events_tenant_status_idx" ON "provider_webhook_events" USING btree ("tenant_id","processing_status");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_memberships_tenant_user_unique_idx" ON "tenant_memberships" USING btree ("tenant_id","user_id");