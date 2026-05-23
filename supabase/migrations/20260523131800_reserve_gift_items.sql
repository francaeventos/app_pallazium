-- Reserve gift items so each product can be chosen only once.

ALTER TABLE public.event_gift_items
ADD COLUMN IF NOT EXISTS reserved_by_guest_id UUID REFERENCES public.event_guests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS event_gift_items_reserved_by_guest_id_idx
ON public.event_gift_items(reserved_by_guest_id);

DROP POLICY IF EXISTS "Public reads published gift items" ON public.event_gift_items;

CREATE POLICY "Public reads published gift items"
ON public.event_gift_items
FOR SELECT
TO anon, authenticated
USING (
  reserved_by_guest_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.event_invitations i
    WHERE i.event_id = event_gift_items.event_id
      AND i.status = 'publicado'
  )
);

CREATE OR REPLACE FUNCTION public.reserve_event_gift_item(
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
  reserved_item public.event_gift_items%ROWTYPE;
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
    reserved_by_guest_id = target_guest.id,
    reserved_at = now()
  WHERE id = _gift_item_id
    AND event_id = target_guest.event_id
    AND reserved_by_guest_id IS NULL
  RETURNING *
  INTO reserved_item;

  IF reserved_item.id IS NULL THEN
    RAISE EXCEPTION 'gift item is no longer available';
  END IF;

  RETURN reserved_item;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_event_gift_item(TEXT, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.reserve_event_gift_item(TEXT, UUID) TO anon, authenticated;
