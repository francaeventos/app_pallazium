-- Allow admins to publish or hide portfolio items without deleting them.

ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "All read portfolio" ON public.portfolio_items;
CREATE POLICY "Authenticated read active portfolio"
ON public.portfolio_items
FOR SELECT
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));
