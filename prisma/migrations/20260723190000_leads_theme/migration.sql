-- AlterTable
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "primary_color" TEXT NOT NULL DEFAULT '#128C7E';
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "wallpaper_url" TEXT;
ALTER TABLE "lead_forms" ADD COLUMN IF NOT EXISTS "header_subtitle" TEXT;
