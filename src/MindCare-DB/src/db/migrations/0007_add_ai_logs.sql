-- Migration: 0007_add_ai_logs
-- Cria enum e tabela ai_logs para auditoria das interações com IA

DO $$ BEGIN
  CREATE TYPE "ai_action_type" AS ENUM (
    'draft_record',
    'improve_text',
    'suggest_diagnosis',
    'summarize',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ai_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "professional_id" integer REFERENCES "health_professionals"("id"),
  "medical_record_id" integer REFERENCES "medical_records"("id"),
  "action_type" "ai_action_type" NOT NULL,
  "prompt" text NOT NULL,
  "response" text,
  "model" varchar(100),
  "tokens_used" integer,
  "duration_ms" integer,
  "success" boolean NOT NULL DEFAULT true,
  "error_message" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_logs_user_idx" ON "ai_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_logs_professional_idx" ON "ai_logs" ("professional_id");
CREATE INDEX IF NOT EXISTS "ai_logs_medical_record_idx" ON "ai_logs" ("medical_record_id");
CREATE INDEX IF NOT EXISTS "ai_logs_created_at_idx" ON "ai_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_logs_action_type_idx" ON "ai_logs" ("action_type");
