-- Harden client-facing permissions before exposing the portal to real customers.

CREATE OR REPLACE FUNCTION public.client_owns_event(
  _client_id UUID,
  _event_id UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE c.id = _client_id
      AND e.id = _event_id
      AND c.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.prevent_client_checklist_internal_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = OLD.event_id
      AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'checklist item does not belong to the authenticated client';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.due_date IS DISTINCT FROM OLD.due_date
     OR NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
     OR NEW.attachment_url IS DISTINCT FROM OLD.attachment_url
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'clients can only update checklist status and client notes';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_client_checklist_internal_update ON public.checklist_items;
CREATE TRIGGER prevent_client_checklist_internal_update
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_checklist_internal_update();

DROP POLICY IF EXISTS "Client creates interests" ON public.upgrade_interests;
CREATE POLICY "Client creates interests" ON public.upgrade_interests
FOR INSERT TO authenticated
WITH CHECK (
  public.client_owns_event(client_id, event_id, auth.uid())
);

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY client_id, event_id, upgrade_id
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.upgrade_interests
)
DELETE FROM public.upgrade_interests ui
USING ranked r
WHERE ui.id = r.id
  AND r.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS upgrade_interests_unique_client_event_upgrade
ON public.upgrade_interests (client_id, event_id, upgrade_id);

CREATE OR REPLACE FUNCTION public.link_client_to_auth_user_by_email(_client_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  linked_user_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'only admins can link clients to auth users';
  END IF;

  SELECT au.id
  INTO linked_user_id
  FROM public.clients c
  JOIN auth.users au ON lower(au.email) = lower(c.email)
  WHERE c.id = _client_id
  ORDER BY au.created_at ASC
  LIMIT 1;

  IF linked_user_id IS NULL THEN
    RAISE EXCEPTION 'no auth user found with this client email';
  END IF;

  UPDATE public.clients
  SET user_id = linked_user_id
  WHERE id = _client_id;

  RETURN linked_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.client_owns_event(UUID, UUID, UUID) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_client_checklist_internal_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.link_client_to_auth_user_by_email(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.link_client_to_auth_user_by_email(UUID) TO authenticated;
