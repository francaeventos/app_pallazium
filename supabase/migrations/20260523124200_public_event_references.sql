-- Make event references available as a shared inspiration library.

DROP POLICY IF EXISTS "Authenticated reads all refs" ON public.event_references;

CREATE POLICY "Authenticated reads all refs"
ON public.event_references
FOR SELECT
TO authenticated
USING (true);
