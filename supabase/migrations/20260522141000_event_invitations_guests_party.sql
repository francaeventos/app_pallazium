-- Event invitations, guest RSVP and wedding party management.

CREATE TYPE public.invitation_status AS ENUM ('rascunho', 'publicado', 'pausado');
CREATE TYPE public.rsvp_status AS ENUM ('pendente', 'confirmado', 'recusado');

CREATE TABLE public.event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  title TEXT NOT NULL,
  message TEXT,
  cover_image_url TEXT,
  dress_code TEXT,
  ceremony_location TEXT,
  reception_location TEXT,
  map_url TEXT,
  whatsapp_text TEXT,
  status public.invitation_status NOT NULL DEFAULT 'rascunho',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.event_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES public.event_invitations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  group_name TEXT,
  allowed_companions INTEGER NOT NULL DEFAULT 0,
  confirmed_companions INTEGER NOT NULL DEFAULT 0,
  rsvp_status public.rsvp_status NOT NULL DEFAULT 'pendente',
  dietary_restrictions TEXT,
  notes TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_guests_allowed_companions_non_negative CHECK (allowed_companions >= 0),
  CONSTRAINT event_guests_confirmed_companions_non_negative CHECK (confirmed_companions >= 0),
  CONSTRAINT event_guests_confirmed_within_allowed CHECK (confirmed_companions <= allowed_companions)
);

CREATE TABLE public.event_party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  side TEXT,
  phone TEXT,
  email TEXT,
  attire TEXT,
  rsvp_status public.rsvp_status NOT NULL DEFAULT 'pendente',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_party_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invitations"
ON public.event_invitations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client reads own invitation"
ON public.event_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_invitations.event_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Client updates own invitation"
ON public.event_invitations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_invitations.event_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_invitations.event_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Public reads published invitation by token"
ON public.event_invitations
FOR SELECT
TO anon, authenticated
USING (status = 'publicado');

CREATE POLICY "Admins manage guests"
ON public.event_guests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client manages own guests"
ON public.event_guests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_guests.event_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_guests.event_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Public reads guests for published invitations"
ON public.event_guests
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.event_invitations i
    WHERE i.id = event_guests.invitation_id
      AND i.status = 'publicado'
  )
);

CREATE POLICY "Public updates guest RSVP"
ON public.event_guests
FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.event_invitations i
    WHERE i.id = event_guests.invitation_id
      AND i.status = 'publicado'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.event_invitations i
    WHERE i.id = event_guests.invitation_id
      AND i.status = 'publicado'
  )
);

CREATE OR REPLACE FUNCTION public.prevent_public_guest_internal_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin')
     OR EXISTS (
       SELECT 1
       FROM public.events e
       JOIN public.clients c ON c.id = e.client_id
       WHERE e.id = OLD.event_id
         AND c.user_id = auth.uid()
     ) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id
     OR NEW.invitation_id IS DISTINCT FROM OLD.invitation_id
     OR NEW.name IS DISTINCT FROM OLD.name
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.group_name IS DISTINCT FROM OLD.group_name
     OR NEW.allowed_companions IS DISTINCT FROM OLD.allowed_companions
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'public guests can only update RSVP fields';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_public_guest_internal_update
BEFORE UPDATE ON public.event_guests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_public_guest_internal_update();

CREATE POLICY "Admins manage party members"
ON public.event_party_members
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client manages own party members"
ON public.event_party_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_party_members.event_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.clients c ON c.id = e.client_id
    WHERE e.id = event_party_members.event_id
      AND c.user_id = auth.uid()
  )
);

CREATE TRIGGER touch_event_invitations
BEFORE UPDATE ON public.event_invitations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_event_guests
BEFORE UPDATE ON public.event_guests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_event_party_members
BEFORE UPDATE ON public.event_party_members
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS event_guests_event_id_idx ON public.event_guests(event_id);
CREATE INDEX IF NOT EXISTS event_guests_invitation_id_idx ON public.event_guests(invitation_id);
CREATE INDEX IF NOT EXISTS event_guests_rsvp_status_idx ON public.event_guests(rsvp_status);
CREATE INDEX IF NOT EXISTS event_party_members_event_id_idx ON public.event_party_members(event_id);
