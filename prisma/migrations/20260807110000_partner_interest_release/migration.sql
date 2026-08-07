-- Controle de liberação dos dados de contato do cliente para o parceiro.
ALTER TABLE "partner_interests"
  ADD COLUMN IF NOT EXISTS "client_data_released" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "released_at" TIMESTAMPTZ(6);
