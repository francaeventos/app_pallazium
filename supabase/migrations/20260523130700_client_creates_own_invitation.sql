-- Allow clients to create their own event invitation.

DROP POLICY IF EXISTS "Client creates own invitation" ON public.event_invitations;

CREATE POLICY "Client creates own invitation"
ON public.event_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_invitations.event_id
      AND c.user_id = auth.uid()
  )
);
