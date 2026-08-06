-- Novo papel "parceiro" e conta vinculada ao registro de parceiro, com
-- campos extras de perfil (logo, site, galeria).
ALTER TYPE "app_role" ADD VALUE IF NOT EXISTS 'parceiro';

ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "user_id" UUID,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "website_url" TEXT,
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "gallery_urls" TEXT[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS "partners_user_id_key" ON "partners"("user_id");

ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
