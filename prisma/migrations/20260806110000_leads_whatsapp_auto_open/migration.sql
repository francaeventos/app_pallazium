-- Controle de abertura automática do WhatsApp no encerramento padrão do quiz
ALTER TABLE "lead_forms"
  ADD COLUMN IF NOT EXISTS "whatsapp_auto_open" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "whatsapp_auto_open_delay_sec" INTEGER NOT NULL DEFAULT 3;
