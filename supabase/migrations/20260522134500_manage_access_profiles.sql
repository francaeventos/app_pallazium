-- Make access management friendlier by storing auth email in profiles.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT DO NOTHING;

  UPDATE public.clients
  SET user_id = NEW.id
  WHERE user_id IS NULL
    AND lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_user_to_admin_by_email(_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT id INTO _user_id
  FROM auth.users
  WHERE lower(email) = lower(_email)
  LIMIT 1;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado para o e-mail %', _email;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_user_to_admin_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin_by_email(TEXT) TO authenticated;
