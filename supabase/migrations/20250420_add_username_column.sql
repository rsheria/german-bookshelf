-- Add username column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text NOT NULL DEFAULT '';

-- Optionally enforce uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_username_unique'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END
$$;
