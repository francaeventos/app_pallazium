-- Status de negociação comercial atribuído manualmente a cada lead pela equipe.
DO $$ BEGIN
  CREATE TYPE "lead_negotiation_status" AS ENUM (
    'contratou',
    'cancelou',
    'nao_responde',
    'negociacao_quente',
    'negociacao'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "negotiation_status" "lead_negotiation_status";
