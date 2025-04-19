-- Migration: Add RLS policies for the `avatars` storage bucket
BEGIN;

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects
  ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present and create new ones
DROP POLICY IF EXISTS avatars_allow_insert ON storage.objects;
CREATE POLICY avatars_allow_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS avatars_allow_select ON storage.objects;
CREATE POLICY avatars_allow_select
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars'
  );

COMMIT;
