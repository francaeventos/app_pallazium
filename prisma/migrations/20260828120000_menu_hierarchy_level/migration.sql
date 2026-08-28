-- Nível de hierarquia dos cardápios, usado para definir quais opções de upgrade
-- são exibidas ao cliente com base no cardápio já contratado no evento.
ALTER TABLE "menus"
  ADD COLUMN IF NOT EXISTS "hierarchy_level" INTEGER NOT NULL DEFAULT 0;
