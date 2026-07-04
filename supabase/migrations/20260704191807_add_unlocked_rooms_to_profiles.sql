ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS unlocked_rooms text[];

ALTER TABLE public.profiles
ALTER COLUMN unlocked_rooms SET DEFAULT ARRAY['room_lv1']::text[];

UPDATE public.profiles
SET unlocked_rooms = array_prepend(
  'room_lv1'::text,
  COALESCE(unlocked_rooms, ARRAY[]::text[])
)
WHERE unlocked_rooms IS NULL
   OR NOT ('room_lv1' = ANY(unlocked_rooms));

ALTER TABLE public.profiles
ALTER COLUMN unlocked_rooms SET NOT NULL;
