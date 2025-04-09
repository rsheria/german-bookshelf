-- MINIMAL FIX: ONLY ADDS USERNAME COLUMN
-- This script ONLY adds the username column without changing ANY functions

-- Add username column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN username text;
  END IF;
END
$$;

-- Update existing records with usernames from profiles
UPDATE public.activity_logs al
SET username = p.username
FROM public.profiles p
WHERE al.entity_id::uuid = p.id AND al.username IS NULL;

-- Update manually for any records that might not have matched
UPDATE public.activity_logs
SET username = 'Unknown User'
WHERE username IS NULL;
