-- Migration: 0009_add_encryption_fields
-- Aumenta tamanho de colunas para armazenar dados criptografados (AES-256-GCM)
-- Adiciona cpf_hash para busca exata por CPF

ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_cpf_key;

ALTER TABLE patients ALTER COLUMN cpf TYPE varchar(255);

ALTER TABLE patients ALTER COLUMN phone TYPE varchar(255);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS cpf_hash varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS patients_cpf_hash_key ON patients (cpf_hash) WHERE cpf_hash IS NOT NULL;
