
-- 1) Storage: restrict mutations to authenticated; keep public SELECT for public buckets
DROP POLICY IF EXISTS "Pallazium public manage storage" ON storage.objects;

CREATE POLICY "Pallazium public read storage"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars']));

CREATE POLICY "Pallazium authenticated insert storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars']));

CREATE POLICY "Pallazium authenticated update storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars']))
WITH CHECK (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars']));

CREATE POLICY "Pallazium authenticated delete storage"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars']));

-- 2) Checklist: attach trigger preventing clients from updating non-client fields (internal_notes etc.)
DROP TRIGGER IF EXISTS prevent_client_checklist_internal_update_trg ON public.checklist_items;
CREATE TRIGGER prevent_client_checklist_internal_update_trg
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_checklist_internal_update();

-- 3) Event party members: prevent clients from changing sensitive fields via trigger
CREATE OR REPLACE FUNCTION public.prevent_client_party_member_restricted_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.rsvp_status IS DISTINCT FROM OLD.rsvp_status
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'clients cannot modify role, rsvp_status, event_id or system fields on party members';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_client_party_member_restricted_update_trg ON public.event_party_members;
CREATE TRIGGER prevent_client_party_member_restricted_update_trg
BEFORE UPDATE ON public.event_party_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_party_member_restricted_update();

-- 4) Lock down admin-only SECURITY DEFINER functions from anon/authenticated EXECUTE
REVOKE EXECUTE ON FUNCTION public.link_client_to_auth_user_by_email(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin_by_email(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_client_checklist_internal_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_client_party_member_restricted_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.client_owns_event(uuid, uuid, uuid) FROM anon, public;
