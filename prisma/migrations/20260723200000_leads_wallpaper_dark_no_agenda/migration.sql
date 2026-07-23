-- AlterTable
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "wallpaper_dark_url" TEXT;

-- Desativa agenda de degustação por padrão nos formulários existentes
UPDATE "lead_forms" SET "agenda_enabled" = false;
