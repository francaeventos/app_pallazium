-- ebooks table
CREATE TABLE IF NOT EXISTS public.ebooks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  cover_url   text,
  file_url    text        NOT NULL,
  file_name   text        NOT NULL,
  file_size   bigint,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ebooks_updated_at ON public.ebooks;
CREATE TRIGGER ebooks_updated_at
  BEFORE UPDATE ON public.ebooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ebooks_admin_all" ON public.ebooks;
DROP POLICY IF EXISTS "ebooks_client_read_active" ON public.ebooks;

-- Admins: acesso total
CREATE POLICY "ebooks_admin_all"
  ON public.ebooks
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Clientes autenticados: apenas leitura dos ativos
CREATE POLICY "ebooks_client_read_active"
  ON public.ebooks
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Storage bucket para PDFs (público, até 50 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ebooks',
  'ebooks',
  true,
  52428800,
  ARRAY['application/pdf', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies (mesmo padrão dos outros buckets do projeto)
DROP POLICY IF EXISTS "ebooks_storage_admin_upload" ON storage.objects;
DROP POLICY IF EXISTS "ebooks_storage_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "ebooks_storage_public_read" ON storage.objects;
DROP POLICY IF EXISTS "ebooks_storage_manage" ON storage.objects;

CREATE POLICY "ebooks_storage_manage"
  ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'ebooks')
  WITH CHECK (bucket_id = 'ebooks');
