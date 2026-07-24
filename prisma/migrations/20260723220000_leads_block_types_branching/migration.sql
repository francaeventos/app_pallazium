-- Novos tipos de bloco + condições de saída (next_key)

ALTER TYPE "lead_question_type" ADD VALUE 'number';
ALTER TYPE "lead_question_type" ADD VALUE 'multi';
ALTER TYPE "lead_question_type" ADD VALUE 'buttons';
ALTER TYPE "lead_question_type" ADD VALUE 'scale';
ALTER TYPE "lead_question_type" ADD VALUE 'rating';
ALTER TYPE "lead_question_type" ADD VALUE 'message';
ALTER TYPE "lead_question_type" ADD VALUE 'confirm';
ALTER TYPE "lead_question_type" ADD VALUE 'redirect';
ALTER TYPE "lead_question_type" ADD VALUE 'lgpd';

ALTER TABLE "lead_form_questions" ADD COLUMN IF NOT EXISTS "next_key" TEXT;
ALTER TABLE "lead_form_options" ADD COLUMN IF NOT EXISTS "next_key" TEXT;
