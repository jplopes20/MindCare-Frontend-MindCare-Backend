-- Migration: 0010_add_consent_tables
-- Cria tabelas consent_terms e user_consents para registro de consentimento (RF030)

DO $$ BEGIN
  CREATE TYPE "consent_term_type" AS ENUM (
    'privacy_policy',
    'terms_of_use',
    'data_processing',
    'lgpd'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "consent_terms" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "type" "consent_term_type" NOT NULL,
  "version" varchar(20) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_consents" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "consent_term_id" integer NOT NULL REFERENCES "consent_terms"("id"),
  "accepted" boolean NOT NULL,
  "ip_address" varchar(45),
  "accepted_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "user_consents_user_idx" ON "user_consents" ("user_id");
