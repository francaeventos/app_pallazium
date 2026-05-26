-- Armazena PDF no banco quando o Supabase Storage não estiver disponível

ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS file_data bytea;

COMMENT ON COLUMN public.ebooks.file_data IS 'PDF armazenado no banco quando file_url usa /ebook-file/{id}';
