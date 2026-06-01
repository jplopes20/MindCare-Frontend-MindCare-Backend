ALTER TYPE "appointment_status" ADD VALUE 'requested' BEFORE 'scheduled';--> statement-breakpoint
ALTER TYPE "appointment_status" ADD VALUE 'confirmed' AFTER 'scheduled';--> statement-breakpoint
ALTER TYPE "appointment_status" ADD VALUE 'rescheduled' AFTER 'confirmed';--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'requested';--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "proposed_start_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "proposed_end_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "negotiation_notes" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "requested_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "appointment_messages" ADD CONSTRAINT "appointment_messages_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_messages" ADD CONSTRAINT "appointment_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_messages_appointment_idx" ON "appointment_messages" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "appointment_messages_sender_idx" ON "appointment_messages" USING btree ("sender_id");
