-- SIMPLIFIED FIX FOR SESSION PERSISTENCE
-- This script avoids complex operations and just does what's necessary to fix session issues

-- =========================================================
-- PART 1: DISABLE RLS ON KEY TABLES
-- =========================================================

-- Disable RLS on critical profile and content tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests DISABLE ROW LEVEL SECURITY;

-- =========================================================
-- PART 2: ENSURE PROPER PERMISSIONS
-- =========================================================

-- Grant access to public tables
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.books TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.download_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.book_requests TO anon, authenticated, service_role;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- =========================================================
-- PART 3: CREATE HELPER FUNCTION FOR ADMIN STATUS
-- =========================================================

-- Create a reliable function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- =========================================================
-- PART 4: UPDATE ADMIN STATUS IN METADATA
-- =========================================================

-- Sync admin status to user metadata
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, is_admin FROM public.profiles WHERE is_admin = true
  LOOP
    BEGIN
      -- This works only if we have proper permissions
      UPDATE auth.users 
      SET raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{is_admin}',
        'true'::jsonb
      )
      WHERE id = r.id;
      
      RAISE NOTICE 'Updated admin status for user %', r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not update admin status for user %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;
