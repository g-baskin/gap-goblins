CREATE TABLE "automation_action_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"action_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"provider_reference" text,
	"response_metadata" jsonb,
	"error_metadata" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_call_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"source_run_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"deal_id" uuid,
	"assigned_to_user_id" uuid,
	"script" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"outcome" text,
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_dispatch_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"run_id" uuid,
	"revision_id" uuid NOT NULL,
	"successor_node_key" text NOT NULL,
	"operation_key" text NOT NULL,
	"dedup_key" text NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"terminal_error" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_node_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"node_key" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"selected_output" text,
	"output_data" jsonb,
	"error_data" jsonb,
	"operation_key" text NOT NULL,
	"started_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_tenant_assignment_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manifest_hash" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"resource_counts" jsonb NOT NULL,
	"outcome" text NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"flow_id" uuid NOT NULL,
	"node_key" text NOT NULL,
	"public_hook_id" text NOT NULL,
	"secret_reference" text NOT NULL,
	"signing_secret_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_webhook_endpoints_public_hook_id_unique" UNIQUE("public_hook_id")
);
--> statement-breakpoint
CREATE TABLE "automation_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"external_event_id" text,
	"body_hash" text NOT NULL,
	"event_timestamp" timestamp with time zone NOT NULL,
	"payload" jsonb NOT NULL,
	"signature_status" text NOT NULL,
	"processing_status" text DEFAULT 'received' NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_workflow_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"source_node_key" text NOT NULL,
	"target_node_key" text NOT NULL,
	"source_handle" text DEFAULT 'default' NOT NULL,
	"edge_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_edges_no_self_edge" CHECK ("automation_workflow_edges"."source_node_key" <> "automation_workflow_edges"."target_node_key")
);
--> statement-breakpoint
CREATE TABLE "automation_workflow_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"node_key" text NOT NULL,
	"node_type" text NOT NULL,
	"name" text NOT NULL,
	"position_x" integer NOT NULL,
	"position_y" integer NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_workflow_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"flow_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"lifecycle" text DEFAULT 'draft' NOT NULL,
	"graph_hash" text NOT NULL,
	"optimistic_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"superseded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "automation_workflow_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"scope" text DEFAULT 'tenant' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"graph_snapshot" jsonb NOT NULL,
	"created_by" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_enrollments" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "automation_enrollments" ADD COLUMN "revision_id" uuid;--> statement-breakpoint
ALTER TABLE "automation_events" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "automation_flows" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "automation_flows" ADD COLUMN "execution_mode" text DEFAULT 'linear' NOT NULL;--> statement-breakpoint
ALTER TABLE "automation_flows" ADD COLUMN "draft_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "automation_flows" ADD COLUMN "published_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "automation_sends" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "contact_timeline" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "pipelines" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "automation_action_operations" ADD CONSTRAINT "automation_action_operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_action_operations" ADD CONSTRAINT "automation_action_operations_run_id_automation_node_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_node_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_call_tasks" ADD CONSTRAINT "automation_call_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_call_tasks" ADD CONSTRAINT "automation_call_tasks_enrollment_id_automation_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."automation_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_call_tasks" ADD CONSTRAINT "automation_call_tasks_source_run_id_automation_node_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."automation_node_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_call_tasks" ADD CONSTRAINT "automation_call_tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_call_tasks" ADD CONSTRAINT "automation_call_tasks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_call_tasks" ADD CONSTRAINT "automation_call_tasks_assigned_to_user_id_admin_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_dispatch_outbox" ADD CONSTRAINT "automation_dispatch_outbox_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_dispatch_outbox" ADD CONSTRAINT "automation_dispatch_outbox_enrollment_id_automation_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."automation_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_dispatch_outbox" ADD CONSTRAINT "automation_dispatch_outbox_run_id_automation_node_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_node_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_dispatch_outbox" ADD CONSTRAINT "automation_dispatch_outbox_revision_id_automation_workflow_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."automation_workflow_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_node_runs" ADD CONSTRAINT "automation_node_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_node_runs" ADD CONSTRAINT "automation_node_runs_enrollment_id_automation_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."automation_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_node_runs" ADD CONSTRAINT "automation_node_runs_revision_id_automation_workflow_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."automation_workflow_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_tenant_assignment_audits" ADD CONSTRAINT "automation_tenant_assignment_audits_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_webhook_endpoints" ADD CONSTRAINT "automation_webhook_endpoints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_webhook_endpoints" ADD CONSTRAINT "automation_webhook_endpoints_flow_id_automation_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."automation_flows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_webhook_events" ADD CONSTRAINT "automation_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_webhook_events" ADD CONSTRAINT "automation_webhook_events_endpoint_id_automation_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."automation_webhook_endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_edges" ADD CONSTRAINT "automation_workflow_edges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_edges" ADD CONSTRAINT "automation_workflow_edges_revision_id_automation_workflow_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."automation_workflow_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_nodes" ADD CONSTRAINT "automation_workflow_nodes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_nodes" ADD CONSTRAINT "automation_workflow_nodes_revision_id_automation_workflow_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."automation_workflow_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_revisions" ADD CONSTRAINT "automation_workflow_revisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_revisions" ADD CONSTRAINT "automation_workflow_revisions_flow_id_automation_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."automation_flows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_revisions" ADD CONSTRAINT "automation_workflow_revisions_author_id_admin_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_templates" ADD CONSTRAINT "automation_workflow_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_templates" ADD CONSTRAINT "automation_workflow_templates_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "automation_action_operations_tenant_idempotency_unique_idx" ON "automation_action_operations" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "automation_action_operations_tenant_state_idx" ON "automation_action_operations" USING btree ("tenant_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_call_tasks_tenant_run_unique_idx" ON "automation_call_tasks" USING btree ("tenant_id","source_run_id");--> statement-breakpoint
CREATE INDEX "automation_call_tasks_tenant_status_due_idx" ON "automation_call_tasks" USING btree ("tenant_id","status","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_outbox_tenant_dedup_unique_idx" ON "automation_dispatch_outbox" USING btree ("tenant_id","dedup_key");--> statement-breakpoint
CREATE INDEX "automation_outbox_tenant_publish_idx" ON "automation_dispatch_outbox" USING btree ("tenant_id","published_at","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_node_runs_tenant_operation_unique_idx" ON "automation_node_runs" USING btree ("tenant_id","operation_key");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_node_runs_enrollment_node_attempt_unique_idx" ON "automation_node_runs" USING btree ("enrollment_id","node_key","attempt");--> statement-breakpoint
CREATE INDEX "automation_node_runs_tenant_enrollment_status_idx" ON "automation_node_runs" USING btree ("tenant_id","enrollment_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_tenant_assignment_manifest_outcome_unique_idx" ON "automation_tenant_assignment_audits" USING btree ("manifest_hash","outcome");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_webhook_endpoints_tenant_flow_node_unique_idx" ON "automation_webhook_endpoints" USING btree ("tenant_id","flow_id","node_key");--> statement-breakpoint
CREATE INDEX "automation_webhook_endpoints_tenant_status_idx" ON "automation_webhook_endpoints" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_webhook_events_endpoint_external_unique_idx" ON "automation_webhook_events" USING btree ("endpoint_id","external_event_id") WHERE "automation_webhook_events"."external_event_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "automation_webhook_events_endpoint_hash_unique_idx" ON "automation_webhook_events" USING btree ("endpoint_id","body_hash");--> statement-breakpoint
CREATE INDEX "automation_webhook_events_tenant_status_idx" ON "automation_webhook_events" USING btree ("tenant_id","processing_status");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_edges_tenant_revision_path_unique_idx" ON "automation_workflow_edges" USING btree ("tenant_id","revision_id","source_node_key","source_handle","target_node_key");--> statement-breakpoint
CREATE INDEX "automation_edges_tenant_revision_source_idx" ON "automation_workflow_edges" USING btree ("tenant_id","revision_id","source_node_key","edge_order");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_nodes_tenant_revision_key_unique_idx" ON "automation_workflow_nodes" USING btree ("tenant_id","revision_id","node_key");--> statement-breakpoint
CREATE INDEX "automation_nodes_tenant_revision_idx" ON "automation_workflow_nodes" USING btree ("tenant_id","revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_revisions_tenant_flow_version_unique_idx" ON "automation_workflow_revisions" USING btree ("tenant_id","flow_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_revisions_one_draft_idx" ON "automation_workflow_revisions" USING btree ("tenant_id","flow_id") WHERE "automation_workflow_revisions"."lifecycle" = 'draft';--> statement-breakpoint
CREATE INDEX "automation_revisions_tenant_flow_lifecycle_idx" ON "automation_workflow_revisions" USING btree ("tenant_id","flow_id","lifecycle");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_templates_scope_tenant_name_version_unique_idx" ON "automation_workflow_templates" USING btree ("scope","tenant_id","name","version");--> statement-breakpoint
CREATE INDEX "automation_templates_tenant_category_idx" ON "automation_workflow_templates" USING btree ("tenant_id","category");--> statement-breakpoint
ALTER TABLE "automation_enrollments" ADD CONSTRAINT "automation_enrollments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_enrollments" ADD CONSTRAINT "automation_enrollments_revision_id_automation_workflow_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."automation_workflow_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_events" ADD CONSTRAINT "automation_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_flows" ADD CONSTRAINT "automation_flows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_flows" ADD CONSTRAINT "automation_flows_draft_revision_id_automation_workflow_revisions_id_fk" FOREIGN KEY ("draft_revision_id") REFERENCES "public"."automation_workflow_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_flows" ADD CONSTRAINT "automation_flows_published_revision_id_automation_workflow_revisions_id_fk" FOREIGN KEY ("published_revision_id") REFERENCES "public"."automation_workflow_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_sends" ADD CONSTRAINT "automation_sends_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_timeline" ADD CONSTRAINT "contact_timeline_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_enrollments_tenant_status_idx" ON "automation_enrollments" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "automation_events_tenant_created_idx" ON "automation_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "automation_flows_tenant_status_idx" ON "automation_flows" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "automation_sends_tenant_status_idx" ON "automation_sends" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "contacts_tenant_email_idx" ON "contacts" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "deals_tenant_stage_idx" ON "deals" USING btree ("tenant_id","stage_id");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_tenant_email_idx" ON "newsletter_subscribers" USING btree ("tenant_id","email");