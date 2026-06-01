CREATE TABLE IF NOT EXISTS "professional_patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"professional_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_patients" ADD CONSTRAINT "professional_patients_professional_id_health_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."health_professionals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_patients" ADD CONSTRAINT "professional_patients_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prof_patients_professional_idx" ON "professional_patients" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prof_patients_patient_idx" ON "professional_patients" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prof_patients_unique_pair" ON "professional_patients" USING btree ("professional_id","patient_id");
