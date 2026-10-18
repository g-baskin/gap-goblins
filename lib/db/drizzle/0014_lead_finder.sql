CREATE TABLE "lead_businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kgmid" text,
	"place_id" text,
	"cid" text,
	"name" text NOT NULL,
	"main_category" text,
	"address" text,
	"phone_raw" text,
	"phone_e164" text,
	"website" text,
	"gbp_url" text,
	"rating" real,
	"review_count" integer,
	"image_count" integer,
	"can_claim" boolean,
	"has_description" boolean,
	"has_hours" boolean,
	"owner_posts_count" integer,
	"is_permanently_closed" boolean,
	"is_temporarily_closed" boolean,
	"email" text,
	"raw_payload" jsonb,
	"contact_id" uuid,
	"deal_id" uuid,
	"first_seen_scan_id" uuid,
	"last_seen_scan_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"scan_result_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"rubric_version" text NOT NULL,
	"generated_by" uuid,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_reports_storage_key_tenant_check" CHECK ("lead_reports"."storage_key" like 'tenants/' || "lead_reports"."tenant_id"::text || '/%')
);
--> statement-breakpoint
CREATE TABLE "lead_scan_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"flags" jsonb NOT NULL,
	"rubric_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_scan_results_score_check" CHECK ("lead_scan_results"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "lead_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"niche" text NOT NULL,
	"location" text NOT NULL,
	"max_results" integer DEFAULT 50 NOT NULL,
	"source" text NOT NULL,
	"source_file_key" text,
	"source_file_name" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"found_count" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"skipped_closed_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_by" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_scans_status_check" CHECK ("lead_scans"."status" in ('queued', 'running', 'completed', 'failed', 'cancelled')),
	CONSTRAINT "lead_scans_max_results_check" CHECK ("lead_scans"."max_results" between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "tenant_branding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_name" text,
	"logo_storage_key" text,
	"primary_color" text,
	"accent_color" text,
	"cta_headline" text,
	"cta_body" text,
	"cta_url" text,
	"contact_email" text,
	"contact_phone" text,
	"website" text,
	"physical_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "lead_businesses_tenant_id_unique_idx" ON "lead_businesses" USING btree ("tenant_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "lead_businesses_tenant_kgmid_unique_idx" ON "lead_businesses" USING btree ("tenant_id","kgmid") WHERE "lead_businesses"."kgmid" is not null;
--> statement-breakpoint
CREATE INDEX "lead_businesses_tenant_place_id_idx" ON "lead_businesses" USING btree ("tenant_id","place_id");
--> statement-breakpoint
CREATE INDEX "lead_businesses_tenant_cid_idx" ON "lead_businesses" USING btree ("tenant_id","cid");
--> statement-breakpoint
CREATE INDEX "lead_businesses_tenant_phone_idx" ON "lead_businesses" USING btree ("tenant_id","phone_e164");
--> statement-breakpoint
CREATE INDEX "lead_businesses_tenant_gbp_url_idx" ON "lead_businesses" USING btree ("tenant_id","gbp_url");
--> statement-breakpoint
CREATE INDEX "lead_businesses_tenant_contact_idx" ON "lead_businesses" USING btree ("tenant_id","contact_id");
--> statement-breakpoint
CREATE INDEX "lead_reports_tenant_business_idx" ON "lead_reports" USING btree ("tenant_id","business_id","generated_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "lead_scan_results_tenant_id_unique_idx" ON "lead_scan_results" USING btree ("tenant_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "lead_scan_results_scan_business_unique_idx" ON "lead_scan_results" USING btree ("scan_id","business_id");
--> statement-breakpoint
CREATE INDEX "lead_scan_results_tenant_scan_score_idx" ON "lead_scan_results" USING btree ("tenant_id","scan_id","score");
--> statement-breakpoint
CREATE INDEX "lead_scan_results_tenant_business_idx" ON "lead_scan_results" USING btree ("tenant_id","business_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "lead_scans_tenant_id_unique_idx" ON "lead_scans" USING btree ("tenant_id","id");
--> statement-breakpoint
CREATE INDEX "lead_scans_tenant_created_idx" ON "lead_scans" USING btree ("tenant_id","created_at");
--> statement-breakpoint
CREATE INDEX "lead_scans_tenant_status_idx" ON "lead_scans" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_branding_tenant_unique_idx" ON "tenant_branding" USING btree ("tenant_id");
--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD CONSTRAINT "lead_businesses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD CONSTRAINT "lead_businesses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD CONSTRAINT "lead_businesses_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD CONSTRAINT "lead_businesses_first_seen_scan_id_lead_scans_id_fk" FOREIGN KEY ("first_seen_scan_id") REFERENCES "public"."lead_scans"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD CONSTRAINT "lead_businesses_last_seen_scan_id_lead_scans_id_fk" FOREIGN KEY ("last_seen_scan_id") REFERENCES "public"."lead_scans"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_reports" ADD CONSTRAINT "lead_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_reports" ADD CONSTRAINT "lead_reports_business_id_lead_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."lead_businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_reports" ADD CONSTRAINT "lead_reports_scan_result_id_lead_scan_results_id_fk" FOREIGN KEY ("scan_result_id") REFERENCES "public"."lead_scan_results"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_reports" ADD CONSTRAINT "lead_reports_generated_by_admin_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_reports" ADD CONSTRAINT "lead_reports_tenant_business_fk" FOREIGN KEY ("tenant_id","business_id") REFERENCES "public"."lead_businesses"("tenant_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_reports" ADD CONSTRAINT "lead_reports_tenant_scan_result_fk" FOREIGN KEY ("tenant_id","scan_result_id") REFERENCES "public"."lead_scan_results"("tenant_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_scan_results" ADD CONSTRAINT "lead_scan_results_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_scan_results" ADD CONSTRAINT "lead_scan_results_scan_id_lead_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."lead_scans"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_scan_results" ADD CONSTRAINT "lead_scan_results_business_id_lead_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."lead_businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_scan_results" ADD CONSTRAINT "lead_scan_results_tenant_scan_fk" FOREIGN KEY ("tenant_id","scan_id") REFERENCES "public"."lead_scans"("tenant_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_scan_results" ADD CONSTRAINT "lead_scan_results_tenant_business_fk" FOREIGN KEY ("tenant_id","business_id") REFERENCES "public"."lead_businesses"("tenant_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_scans" ADD CONSTRAINT "lead_scans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lead_scans" ADD CONSTRAINT "lead_scans_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
