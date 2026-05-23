-- Show available gifts plus gifts reserved by the current guest token.

CREATE OR REPLACE FUNCTION public.get_public_event_gift_items_by_token(_guest_token TEXT)
RETURNS SETOF public.event_gift_items
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_guest public.event_guests%ROWTYPE;
BEGIN
  SELECT g.*
  INTO target_guest
  FROM public.event_guests g
  JOIN public.event_invitations i ON i.id = g.invitation_id
  WHERE g.public_token = _guest_token
    AND i.status = 'publicado'
  LIMIT 1;

  IF target_guest.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT gi.*
  FROM public.event_gift_items gi
  WHERE gi.event_id = target_guest.event_id
    AND (
      gi.reserved_by_guest_id IS NULL
      OR gi.reserved_by_guest_id = target_guest.id
    )
  ORDER BY gi.sort_order, gi.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_event_gift_items_by_token(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_event_gift_items_by_token(TEXT) TO anon, authenticated;
