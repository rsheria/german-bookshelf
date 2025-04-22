-- Migration: Create storage bucket for user avatars
BEGIN;

-- Create the 'avatars' bucket if it doesn't exist
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'avatars'
  ) THEN
    PERFORM storage.create_bucket('avatars', true);
  END IF;
END
$do$;

COMMIT;
