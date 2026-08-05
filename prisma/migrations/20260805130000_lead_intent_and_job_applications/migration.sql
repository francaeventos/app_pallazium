-- Texto configurável do botão de encerramento (bloco redirect)
ALTER TABLE "lead_form_questions"
  ADD COLUMN IF NOT EXISTS "redirect_button_label" TEXT;

-- CreateEnum
CREATE TYPE "lead_intent" AS ENUM ('evento', 'parceria', 'trabalhe_conosco');

-- CreateEnum
CREATE TYPE "job_application_status" AS ENUM ('novo', 'em_analise', 'contatado', 'descartado');

-- Origem/intenção do lead (evento, parceria, trabalhe_conosco)
ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "intent" "lead_intent" NOT NULL DEFAULT 'evento';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_intent_idx" ON "leads"("intent");

-- CreateTable
CREATE TABLE "job_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "birth_date" DATE,
    "role_interest" TEXT NOT NULL,
    "has_experience" BOOLEAN NOT NULL DEFAULT false,
    "experience_details" TEXT,
    "availability" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "additional_info" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "status" "job_application_status" NOT NULL DEFAULT 'novo',
    "notes" TEXT,
    "source_url" TEXT,
    "utm" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");

-- CreateIndex
CREATE INDEX "job_applications_created_at_idx" ON "job_applications"("created_at");
