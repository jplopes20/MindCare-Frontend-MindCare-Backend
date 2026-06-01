CREATE TABLE IF NOT EXISTS "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"professional_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"observations" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_professional_id_health_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."health_professionals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_professional_idx" ON "reports" USING btree ("professional_id");
