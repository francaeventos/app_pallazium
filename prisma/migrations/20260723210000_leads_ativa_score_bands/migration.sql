-- CreateEnum
CREATE TYPE "lead_temperature" AS ENUM ('frio', 'morno', 'quente', 'muito_quente');

-- CreateEnum
CREATE TYPE "lead_conversion_min_temperature" AS ENUM ('any', 'morno', 'quente', 'muito_quente');

-- AlterTable lead_forms
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "score_cold_max" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "score_warm_max" INTEGER NOT NULL DEFAULT 49;
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "score_hot_max" INTEGER NOT NULL DEFAULT 74;
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "bot_delay_ms" INTEGER NOT NULL DEFAULT 850;
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "seo_title" TEXT;
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "seo_description" TEXT;
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "page_bg_light" TEXT;
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "page_bg_dark" TEXT;

-- Sync qualification_threshold to hot floor (warm_max + 1) for existing rows
UPDATE "lead_forms"
SET "qualification_threshold" = "score_warm_max" + 1
WHERE "qualification_threshold" IS DISTINCT FROM ("score_warm_max" + 1);

-- AlterTable leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "temperature" "lead_temperature" NOT NULL DEFAULT 'frio';
CREATE INDEX IF NOT EXISTS "leads_temperature_idx" ON "leads"("temperature");

-- Backfill temperature from score using form bands when possible
UPDATE "leads" AS l
SET "temperature" = CASE
  WHEN l."score" <= COALESCE(f."score_cold_max", 24) THEN 'frio'::"lead_temperature"
  WHEN l."score" <= COALESCE(f."score_warm_max", 49) THEN 'morno'::"lead_temperature"
  WHEN l."score" <= COALESCE(f."score_hot_max", 74) THEN 'quente'::"lead_temperature"
  ELSE 'muito_quente'::"lead_temperature"
END
FROM "lead_forms" AS f
WHERE f."id" = l."form_id";

-- AlterTable lead_integration_settings
ALTER TABLE "lead_integration_settings" ADD COLUMN IF NOT EXISTS "ga_measurement_id" TEXT;
ALTER TABLE "lead_integration_settings" ADD COLUMN IF NOT EXISTS "google_ads_id" TEXT;
ALTER TABLE "lead_integration_settings" ADD COLUMN IF NOT EXISTS "google_ads_conversion_label" TEXT;
ALTER TABLE "lead_integration_settings" ADD COLUMN IF NOT EXISTS "conversion_min_temperature" "lead_conversion_min_temperature" NOT NULL DEFAULT 'quente';
