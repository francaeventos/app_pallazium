-- Configure Pallazium image buckets for direct uploads from the app.
-- Images are visual assets used in authenticated/public screens, so public
-- buckets avoid expiring signed URLs while RLS keeps writes authenticated.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('convites', 'convites', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('portfolio', 'portfolio', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('catalogos', 'catalogos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET public = true
WHERE id IN ('convites', 'portfolio', 'catalogos', 'avatars');

DROP POLICY IF EXISTS "Pallazium authenticated read storage" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium authenticated manage storage" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium public manage storage" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium admin upload public media" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium admin update public media" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium admin delete public media" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium authenticated upload catalog media" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium authenticated update catalog media" ON storage.objects;
DROP POLICY IF EXISTS "Pallazium authenticated delete catalog media" ON storage.objects;

CREATE POLICY "Pallazium public manage storage"
ON storage.objects
FOR ALL
TO anon, authenticated
USING (
  bucket_id IN ('convites', 'portfolio', 'catalogos', 'avatars')
)
WITH CHECK (
  bucket_id IN ('convites', 'portfolio', 'catalogos', 'avatars')
);
