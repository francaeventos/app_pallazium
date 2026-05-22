-- Complete MVP resources: menu interests, references editing and notifications read state

CREATE TABLE IF NOT EXISTS public.menu_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status public.interest_status NOT NULL DEFAULT 'novo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_interests ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS menu_interests_unique_event_menu
ON public.menu_interests (client_id, event_id, menu_id);

DROP POLICY IF EXISTS "Admins manage menu interests" ON public.menu_interests;
CREATE POLICY "Admins manage menu interests"
ON public.menu_interests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Client reads own menu interests" ON public.menu_interests;
CREATE POLICY "Client reads own menu interests"
ON public.menu_interests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = menu_interests.client_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Client creates menu interests" ON public.menu_interests;
CREATE POLICY "Client creates menu interests"
ON public.menu_interests
FOR INSERT
TO authenticated
WITH CHECK (public.client_owns_event(client_id, event_id, auth.uid()));

DROP POLICY IF EXISTS "Client updates refs" ON public.event_references;
CREATE POLICY "Client updates refs"
ON public.event_references
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_references.event_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_references.event_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Client deletes refs" ON public.event_references;
CREATE POLICY "Client deletes refs"
ON public.event_references
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_references.event_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
