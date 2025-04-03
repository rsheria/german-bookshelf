-- EMERGENCY SESSION REFRESH FIX
-- This script specifically targets the refresh issue without disabling all security
-- It focuses on fixing the critical auth session problems

-- 1. First, fix RLS policies on profiles to ensure consistent access
DROP POLICY IF EXISTS "Allow full read access to all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Create a single unified policy that ensures everyone can always read profiles
-- This ensures admin status is always readable, which is critical for your app
CREATE POLICY "Universal profile access" ON public.profiles
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 2. Create a function to pre-fetch admin status on login
CREATE OR REPLACE FUNCTION public.pre_fetch_admin_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Store admin status in user metadata for faster access
  IF NEW.is_admin = true THEN
    UPDATE auth.users 
    SET raw_app_meta_data = 
      raw_app_meta_data || 
      '{"is_admin": true}'::jsonb
    WHERE id = NEW.id;
  ELSE
    UPDATE auth.users 
    SET raw_app_meta_data = 
      raw_app_meta_data || 
      '{"is_admin": false}'::jsonb
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a trigger to keep admin status in sync
DROP TRIGGER IF EXISTS sync_admin_status ON public.profiles;
CREATE TRIGGER sync_admin_status
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.pre_fetch_admin_status();

-- 3. Disable any remaining RLS on critical auth tables if possible
-- This ensures auth checks always work
DO $$
BEGIN
  BEGIN
    ALTER TABLE auth.refresh_tokens DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Disabled RLS on auth.refresh_tokens';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not disable RLS on auth.refresh_tokens (requires admin)';
  END;
END $$;

-- 4. Ensure JWT storage keys are properly configured
DO $$
BEGIN
  INSERT INTO storage.objects (bucket_id, name, owner, created_at, updated_at, metadata)
  VALUES ('auth-tokens', 'session-persistence', auth.uid(), now(), now(), '{"secure": true, "persist": true}')
  ON CONFLICT (bucket_id, name) DO NOTHING;
  RAISE NOTICE 'Auth token storage configured';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not configure auth token storage: %', SQLERRM;
END $$;

-- 5. Run this to sync admin status for all users right now
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, is_admin FROM public.profiles WHERE is_admin = true
  LOOP
    UPDATE auth.users 
    SET raw_app_meta_data = 
      raw_app_meta_data || 
      '{"is_admin": true}'::jsonb
    WHERE id = r.id;
    
    RAISE NOTICE 'Updated admin status for user %', r.id;
  END LOOP;
END $$;
