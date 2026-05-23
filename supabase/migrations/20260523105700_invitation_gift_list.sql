-- Add gift list support to public RSVP invitations.

ALTER TABLE public.event_invitations
ADD COLUMN IF NOT EXISTS gift_list_url TEXT;

DROP FUNCTION IF EXISTS public.respond_invitation_guest(TEXT, public.rsvp_status, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.get_invitation_guest_by_token(TEXT);

CREATE OR REPLACE FUNCTION public.get_invitation_guest_by_token(_guest_token TEXT)
RETURNS TABLE (
  invitation_id UUID,
  invitation_title TEXT,
  invitation_message TEXT,
  cover_image_url TEXT,
  dress_code TEXT,
  ceremony_location TEXT,
  reception_location TEXT,
  map_url TEXT,
  gift_list_url TEXT,
  whatsapp_text TEXT,
  event_type TEXT,
  event_date DATE,
  start_time TIME,
  event_location TEXT,
  guest_id UUID,
  guest_name TEXT,
  guest_group_name TEXT,
  allowed_companions INTEGER,
  confirmed_companions INTEGER,
  rsvp_status public.rsvp_status,
  dietary_restrictions TEXT,
  responded_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.title,
    i.message,
    i.cover_image_url,
    i.dress_code,
    i.ceremony_location,
    i.reception_location,
    i.map_url,
    i.gift_list_url,
    i.whatsapp_text,
    e.event_type,
    e.event_date,
    e.start_time,
    e.location,
    g.id,
    g.name,
    g.group_name,
    g.allowed_companions,
    g.confirmed_companions,
    g.rsvp_status,
    g.dietary_restrictions,
    g.responded_at
  FROM public.event_guests g
  JOIN public.event_invitations i ON i.id = g.invitation_id
  JOIN public.events e ON e.id = g.event_id
  WHERE g.public_token = _guest_token
    AND i.status = 'publicado'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.respond_invitation_guest(
  _guest_token TEXT,
  _rsvp_status public.rsvp_status,
  _confirmed_companions INTEGER DEFAULT 0,
  _dietary_restrictions TEXT DEFAULT NULL
)
RETURNS TABLE (
  invitation_id UUID,
  invitation_title TEXT,
  invitation_message TEXT,
  cover_image_url TEXT,
  dress_code TEXT,
  ceremony_location TEXT,
  reception_location TEXT,
  map_url TEXT,
  gift_list_url TEXT,
  whatsapp_text TEXT,
  event_type TEXT,
  event_date DATE,
  start_time TIME,
  event_location TEXT,
  guest_id UUID,
  guest_name TEXT,
  guest_group_name TEXT,
  allowed_companions INTEGER,
  confirmed_companions INTEGER,
  rsvp_status public.rsvp_status,
  dietary_restrictions TEXT,
  responded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_guest public.event_guests%ROWTYPE;
  safe_status public.rsvp_status;
  safe_companions INTEGER;
BEGIN
  IF _rsvp_status NOT IN ('confirmado', 'recusado') THEN
    RAISE EXCEPTION 'invalid RSVP status';
  END IF;

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

  safe_status := _rsvp_status;
  safe_companions := CASE
    WHEN safe_status = 'confirmado' THEN LEAST(GREATEST(COALESCE(_confirmed_companions, 0), 0), target_guest.allowed_companions)
    ELSE 0
  END;

  UPDATE public.event_guests
  SET
    rsvp_status = safe_status,
    confirmed_companions = safe_companions,
    dietary_restrictions = NULLIF(TRIM(COALESCE(_dietary_restrictions, '')), ''),
    responded_at = now()
  WHERE id = target_guest.id;

  RETURN QUERY
  SELECT *
  FROM public.get_invitation_guest_by_token(_guest_token);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_invitation_guest_by_token(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.respond_invitation_guest(TEXT, public.rsvp_status, INTEGER, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invitation_guest_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_invitation_guest(TEXT, public.rsvp_status, INTEGER, TEXT) TO anon, authenticated;
