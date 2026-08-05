-- CreateEnum
CREATE TYPE "partner_application_status" AS ENUM ('novo', 'em_analise', 'contatado', 'descartado');

-- CreateTable
CREATE TABLE "partner_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contact_name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "website" TEXT,
    "instagram" TEXT,
    "partnership_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "status" "partner_application_status" NOT NULL DEFAULT 'novo',
    "notes" TEXT,
    "source_url" TEXT,
    "utm" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_applications_status_idx" ON "partner_applications"("status");

-- CreateIndex
CREATE INDEX "partner_applications_created_at_idx" ON "partner_applications"("created_at");
