-- Pixel do OpenAI Ads (ChatGPT Ads) no formulário de leads.
ALTER TABLE "lead_integration_settings"
  ADD COLUMN IF NOT EXISTS "openai_pixel_id" TEXT,
  ADD COLUMN IF NOT EXISTS "openai_pixel_enabled" BOOLEAN NOT NULL DEFAULT true;
