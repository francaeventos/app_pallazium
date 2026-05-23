-- Allow guests to release their own gift reservation.

CREATE OR REPLACE FUNCTION public.release_event_gift_item_reservation(
  _guest_token TEXT,
  _gift_item_id UUID
)
RETURNS public.event_gift_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_guest public.event_guests%ROWTYPE;
  released_item public.event_gift_items%ROWTYPE;
BEGIN
  SELECT g.*
  INTO target_guest
  FROM public.event_guests g
  JOIN public.event_invitations i ON i.id = g.invitation_id
  WHERE g.public_token = _guest_token
    AND i.status = 'publicado'
  LIMIT 1;

  IF target_guest.id IS NULL THEN
    RAISE EXCEPTION 'guest invitation not found';
  END IF;

  UPDATE public.event_gift_items
  SET
    reserved_by_guest_id = NULL,
    reserved_at = NULL
  WHERE id = _gift_item_id
    AND event_id = target_guest.event_id
    AND reserved_by_guest_id = target_guest.id
  RETURNING *
  INTO released_item;

  IF released_item.id IS NULL THEN
    RAISE EXCEPTION 'gift item reservation not found';
  END IF;

  RETURN released_item;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_event_gift_item_reservation(TEXT, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.release_event_gift_item_reservation(TEXT, UUID) TO anon, authenticated;
