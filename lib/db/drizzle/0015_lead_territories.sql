CREATE TABLE "lead_territories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"polygons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"zips" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_territories_name_check" CHECK (length("lead_territories"."name") between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD COLUMN "location_source" text;--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD COLUMN "geocode_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lead_scan_results" ADD COLUMN "territory_status" text;--> statement-breakpoint
ALTER TABLE "lead_scans" ADD COLUMN "territory_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_scans" ADD COLUMN "territory_name" text;--> statement-breakpoint
ALTER TABLE "lead_scans" ADD COLUMN "skipped_outside_territory_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_territories" ADD CONSTRAINT "lead_territories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_territories" ADD CONSTRAINT "lead_territories_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_territories_tenant_id_unique_idx" ON "lead_territories" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_territories_tenant_name_unique_idx" ON "lead_territories" USING btree ("tenant_id","name");--> statement-breakpoint
ALTER TABLE "lead_scans" ADD CONSTRAINT "lead_scans_tenant_territory_fk" FOREIGN KEY ("tenant_id","territory_id") REFERENCES "public"."lead_territories"("tenant_id","id") ON DELETE SET NULL ("territory_id") ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_businesses_tenant_postal_code_idx" ON "lead_businesses" USING btree ("tenant_id","postal_code");--> statement-breakpoint
CREATE INDEX "lead_scans_tenant_territory_idx" ON "lead_scans" USING btree ("tenant_id","territory_id");--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD CONSTRAINT "lead_businesses_location_check" CHECK (("lead_businesses"."latitude" is null) = ("lead_businesses"."longitude" is null) and ("lead_businesses"."latitude" is null or ("lead_businesses"."latitude" between -90 and 90 and "lead_businesses"."longitude" between -180 and 180)));--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD CONSTRAINT "lead_businesses_postal_code_check" CHECK ("lead_businesses"."postal_code" is null or "lead_businesses"."postal_code" ~ '^[0-9]{5}$');--> statement-breakpoint
ALTER TABLE "lead_businesses" ADD CONSTRAINT "lead_businesses_location_source_check" CHECK ("lead_businesses"."location_source" is null or "lead_businesses"."location_source" in ('source', 'census-geocoder'));--> statement-breakpoint
ALTER TABLE "lead_scan_results" ADD CONSTRAINT "lead_scan_results_territory_status_check" CHECK ("lead_scan_results"."territory_status" is null or "lead_scan_results"."territory_status" in ('inside', 'outside', 'unknown'));