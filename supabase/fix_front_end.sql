-- Just add the username column
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS username text;

-- Fill username from profiles where possible
UPDATE public.activity_logs al
SET username = p.username
FROM public.profiles p
WHERE al.entity_id::uuid = p.id AND al.username IS NULL;
