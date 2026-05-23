-- Add image support for event gift list items.

ALTER TABLE public.event_gift_items
ADD COLUMN IF NOT EXISTS image_url TEXT;
