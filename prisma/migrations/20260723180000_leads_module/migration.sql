-- CreateEnum
CREATE TYPE "lead_question_type" AS ENUM ('text', 'email', 'tel', 'choice', 'date');

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('parcial', 'completo', 'agendado', 'descartado');

-- CreateEnum
CREATE TYPE "lead_event_type" AS ENUM (
  'partial_created',
  'completed',
  'qualified',
  'scheduled',
  'webhook_sent',
  'webhook_failed',
  'capi_sent',
  'capi_failed'
);

-- CreateTable
CREATE TABLE "lead_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL DEFAULT 'Espaço Pallazium',
    "agent_name" TEXT NOT NULL DEFAULT 'Bella Festa',
    "agent_title" TEXT,
    "agent_avatar_url" TEXT,
    "whatsapp_destination" TEXT NOT NULL,
    "whatsapp_message" TEXT,
    "privacy_url" TEXT,
    "terms_url" TEXT,
    "qualification_threshold" INTEGER NOT NULL DEFAULT 60,
    "agenda_enabled" BOOLEAN NOT NULL DEFAULT true,
    "agenda_weekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "agenda_times" TEXT[] DEFAULT ARRAY['09:00', '11:00', '14:00', '16:00', '19:00']::TEXT[],
    "agenda_days_ahead" INTEGER NOT NULL DEFAULT 21,
    "agenda_lead_hours" INTEGER NOT NULL DEFAULT 3,
    "agenda_slots_per_slot" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lead_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_form_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "type" "lead_question_type" NOT NULL,
    "label" TEXT,
    "prompt" TEXT,
    "bot_messages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "placeholder" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "score_bonus" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lead_form_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_form_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "score_points" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lead_form_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_form_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "match_key" TEXT,
    "match_value" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_fallback" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lead_form_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL,
    "anon_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "status" "lead_status" NOT NULL DEFAULT 'parcial',
    "score" INTEGER NOT NULL DEFAULT 0,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "utm" JSONB NOT NULL DEFAULT '{}',
    "fbp" TEXT,
    "fbc" TEXT,
    "event_id" TEXT,
    "slot" TEXT,
    "source_url" TEXT,
    "notes" TEXT,
    "scheduled_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "qualified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "type" "lead_event_type" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_integration_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL,
    "gtm_id" TEXT,
    "meta_pixel_id" TEXT,
    "meta_access_token" TEXT,
    "meta_test_event_code" TEXT,
    "webhook_url" TEXT,
    "webhook_secret" TEXT,
    "pixel_enabled" BOOLEAN NOT NULL DEFAULT true,
    "gtm_enabled" BOOLEAN NOT NULL DEFAULT true,
    "capi_enabled" BOOLEAN NOT NULL DEFAULT true,
    "webhook_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lead_integration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_forms_slug_key" ON "lead_forms"("slug");

-- CreateIndex
CREATE INDEX "lead_form_questions_form_id_sort_order_idx" ON "lead_form_questions"("form_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "lead_form_questions_form_id_key_key" ON "lead_form_questions"("form_id", "key");

-- CreateIndex
CREATE INDEX "lead_form_options_question_id_sort_order_idx" ON "lead_form_options"("question_id", "sort_order");

-- CreateIndex
CREATE INDEX "lead_form_rules_form_id_sort_order_idx" ON "lead_form_rules"("form_id", "sort_order");

-- CreateIndex
CREATE INDEX "leads_form_id_whatsapp_idx" ON "leads"("form_id", "whatsapp");

-- CreateIndex
CREATE INDEX "leads_form_id_status_idx" ON "leads"("form_id", "status");

-- CreateIndex
CREATE INDEX "leads_qualified_idx" ON "leads"("qualified");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "leads_slot_idx" ON "leads"("slot");

-- CreateIndex
CREATE INDEX "lead_events_lead_id_type_idx" ON "lead_events"("lead_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "lead_integration_settings_form_id_key" ON "lead_integration_settings"("form_id");

-- AddForeignKey
ALTER TABLE "lead_form_questions" ADD CONSTRAINT "lead_form_questions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "lead_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_form_options" ADD CONSTRAINT "lead_form_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "lead_form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_form_rules" ADD CONSTRAINT "lead_form_rules_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "lead_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "lead_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_integration_settings" ADD CONSTRAINT "lead_integration_settings_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "lead_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
