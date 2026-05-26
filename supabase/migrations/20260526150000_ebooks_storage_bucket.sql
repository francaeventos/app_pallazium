-- Bucket + policies de ebooks (idempotente)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ebooks', 'ebooks', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 52428800, allowed_mime_types = NULL;

-- Inclui ebooks nas policies principais (mesmo padrão de convites/portfolio/catalogos)
DROP POLICY IF EXISTS "Pallazium public read storage" ON storage.objects;
CREATE POLICY "Pallazium public read storage"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars','ebooks']));

DROP POLICY IF EXISTS "Pallazium authenticated insert storage" ON storage.objects;
CREATE POLICY "Pallazium authenticated insert storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars','ebooks']));

DROP POLICY IF EXISTS "Pallazium authenticated update storage" ON storage.objects;
CREATE POLICY "Pallazium authenticated update storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars','ebooks']))
WITH CHECK (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars','ebooks']));

DROP POLICY IF EXISTS "Pallazium authenticated delete storage" ON storage.objects;
CREATE POLICY "Pallazium authenticated delete storage"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = ANY (ARRAY['convites','portfolio','catalogos','avatars','ebooks']));

-- Policies dedicadas (fallback caso as acima não existam no projeto)
DROP POLICY IF EXISTS "ebooks_storage_manage" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium ebooks public read storage" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium ebooks authenticated insert storage" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium ebooks authenticated update storage" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium ebooks authenticated delete storage" ON storage.objects;

CREATE POLICY "Pallazium ebooks public read storage"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ebooks');

CREATE POLICY "Pallazium ebooks authenticated insert storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ebooks');

CREATE POLICY "Pallazium ebooks authenticated update storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ebooks')
WITH CHECK (bucket_id = 'ebooks');

CREATE POLICY "Pallazium ebooks authenticated delete storage"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ebooks');

-- Fallback: catalogos aceita PDF (bucket que já existe no projeto)
UPDATE storage.buckets
SET
  file_size_limit = GREATEST(COALESCE(file_size_limit, 0), 52428800),
  allowed_mime_types = NULL
WHERE id = 'catalogos';
