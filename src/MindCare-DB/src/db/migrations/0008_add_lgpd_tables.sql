-- Migration: 0008_add_lgpd_tables
-- Cria enums, tabelas data_deletion_requests e audit_logs para LGPD (RF029)

DO $$ BEGIN
  CREATE TYPE "deletion_request_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "deletion_request_type" AS ENUM (
    'anonymization',
    'physical'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "data_deletion_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "patient_user_id" integer NOT NULL REFERENCES "users"("id"),
  "status" "deletion_request_status" NOT NULL DEFAULT 'pending',
  "deletion_type" "deletion_request_type" NOT NULL DEFAULT 'anonymization',
  "reason" text,
  "requested_at" timestamp with time zone NOT NULL DEFAULT now(),
  "processed_at" timestamp with time zone,
  "processed_by_user_id" integer REFERENCES "users"("id"),
  "rejection_reason" text
);

CREATE INDEX IF NOT EXISTS "ddr_patient_idx" ON "data_deletion_requests" ("patient_user_id");

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer REFERENCES "users"("id"),
  "action" varchar(100) NOT NULL,
  "entity" varchar(100),
  "entity_id" integer,
  "ip_address" varchar(45),
  "user_agent" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "audit_user_idx" ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_action_idx" ON "audit_logs" ("action");
