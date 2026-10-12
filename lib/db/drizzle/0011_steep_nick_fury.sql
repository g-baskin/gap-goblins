CREATE TABLE "human_nudges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid,
	"deal_id" uuid,
	"nudge_type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"suggested_action" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"snoozed_until" timestamp with time zone,
	"delivered_via" text,
	"delivered_at" timestamp with time zone,
	"acted_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"assigned_to_user_id" uuid,
	"dedup_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "human_nudges_contact_id_idx" ON "human_nudges" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "human_nudges_deal_id_idx" ON "human_nudges" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "human_nudges_status_due_date_idx" ON "human_nudges" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "human_nudges_type_idx" ON "human_nudges" USING btree ("nudge_type");--> statement-breakpoint
CREATE UNIQUE INDEX "human_nudges_dedup_key_unique_idx" ON "human_nudges" USING btree ("dedup_key") WHERE "human_nudges"."dedup_key" IS NOT NULL;