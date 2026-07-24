-- Atraso do redirecionamento (paridade Ativa Dash)
ALTER TABLE "lead_form_questions"
  ADD COLUMN IF NOT EXISTS "redirect_delay_sec" INTEGER NOT NULL DEFAULT 3;
