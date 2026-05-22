-- Only admins can read inactive catalog content directly through the API.

DROP POLICY IF EXISTS "All read menus" ON public.menus;
CREATE POLICY "Authenticated read active menus"
ON public.menus
FOR SELECT
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "All read upgrades" ON public.upgrades;
CREATE POLICY "Authenticated read active upgrades"
ON public.upgrades
FOR SELECT
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "All read partners" ON public.partners;
CREATE POLICY "Authenticated read active partners"
ON public.partners
FOR SELECT
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "All read tips" ON public.tips;
CREATE POLICY "Authenticated read active tips"
ON public.tips
FOR SELECT
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));
