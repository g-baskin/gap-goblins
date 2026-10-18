ALTER TABLE "conversation_threads" ADD COLUMN "unread_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD COLUMN "last_message_preview" text;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_threads_open_contact_channel_unique_idx" ON "conversation_threads" USING btree ("tenant_id","contact_id","channel") WHERE "conversation_threads"."state" = 'open';--> statement-breakpoint
CREATE INDEX "conversation_threads_tenant_last_event_idx" ON "conversation_threads" USING btree ("tenant_id","last_event_at");--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_unread_count_check" CHECK ("conversation_threads"."unread_count" >= 0);