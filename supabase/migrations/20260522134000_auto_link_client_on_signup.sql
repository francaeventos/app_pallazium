-- Link a newly signed-up auth user to an existing client with the same email.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name;

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
