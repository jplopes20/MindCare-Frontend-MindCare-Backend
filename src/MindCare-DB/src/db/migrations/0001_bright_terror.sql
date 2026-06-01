CREATE TABLE IF NOT EXISTS "emotion_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"mood_value" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emotion_logs" ADD CONSTRAINT "emotion_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emotion_logs_patient_idx" ON "emotion_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emotion_logs_created_at_idx" ON "emotion_logs" USING btree ("created_at");
