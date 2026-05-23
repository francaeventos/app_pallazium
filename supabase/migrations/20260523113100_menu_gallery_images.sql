-- Allow menus to have multiple gallery images while keeping image_url as cover.

ALTER TABLE public.menus
ADD COLUMN IF NOT EXISTS images TEXT[];

UPDATE public.menus
SET images = ARRAY[image_url]
WHERE images IS NULL
  AND image_url IS NOT NULL
  AND image_url <> '';
