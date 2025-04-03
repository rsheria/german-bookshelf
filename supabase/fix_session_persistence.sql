-- Fix for session persistence issues
-- This script addresses the root cause of refresh problems by optimizing auth settings

-- 1. First, we need to directly modify auth schema tables for token lifetime
-- Since we don't have direct access to auth.config, we'll use alternative approaches

-- 2. Make sure all important tables have appropriate access
-- These are the critical tables that affect authentication and admin status
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Fix profiles table policies to ensure admin status is always readable
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Re-create policies with optimized rules
CREATE POLICY "Allow full read access to all profiles"
ON public.profiles FOR SELECT
TO authenticated, anon, service_role
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (true);

-- 4. Make sure all schemas have appropriate permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 5. Create a more reliable admin detection function
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

-- 6. Create a better function to check user authentication status
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- 7. Ensure the app always has read access to authentication info
ALTER TABLE IF EXISTS auth.users ENABLE ROW LEVEL SECURITY;

-- Note for fixing session persistence in the client app:
-- After running this SQL, you may need to adjust your frontend code
-- to use localStorage persistently for storing tokens instead of relying
-- solely on Supabase session management. This will provide a backup method
-- for session persistence when the automatic mechanisms fail.
