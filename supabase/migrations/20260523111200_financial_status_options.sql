-- Manage reusable financial status options for events.

CREATE TABLE IF NOT EXISTS public.financial_status_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_status_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage financial status options" ON public.financial_status_options;
DROP POLICY IF EXISTS "Authenticated reads financial status options" ON public.financial_status_options;

CREATE POLICY "Admins manage financial status options"
ON public.financial_status_options
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated reads financial status options"
ON public.financial_status_options
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.financial_status_options (label, sort_order)
VALUES
  ('Em aberto', 0),
  ('Sinal pago', 1),
  ('Parcialmente pago', 2),
  ('Pago', 3),
  ('Vencido', 4),
  ('Cancelado', 5)
ON CONFLICT (label) DO NOTHING;
