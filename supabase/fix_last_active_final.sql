-- FINAL FIX FOR LAST_ACTIVE TIMESTAMP ISSUE
-- This script specifically focuses on fixing the last_active timestamp for all users in admin dashboard

BEGIN;

-- ========================================================
-- 1. Fix profiles table RLS policies for last_active updates
-- ========================================================

-- Make sure the profiles table has appropriate RLS settings
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Allow updating last_active" ON public.profiles;
DROP POLICY IF EXISTS "Allow updating last_active from trigger" ON public.profiles;

-- Create policies to ensure admin can see all profiles
DROP POLICY IF EXISTS "Admin has full access to profiles" ON public.profiles;
CREATE POLICY "Admin has full access to profiles" ON public.profiles
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Make sure users can update their own last_active
DROP POLICY IF EXISTS "Users can update last_active" ON public.profiles;
CREATE POLICY "Users can update last_active" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ========================================================
-- 2. Create direct function to update last_active
-- ========================================================

-- Create a secure function to update last_active directly
CREATE OR REPLACE FUNCTION public.update_last_active_now(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = user_id;
END;
$$;

-- ========================================================
-- 3. Trigger to update last_active when user logs in
-- ========================================================

-- Create a function that will be triggered on user login
CREATE OR REPLACE FUNCTION public.record_user_login_and_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_active timestamp
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create a trigger on the ip_logs table
DROP TRIGGER IF EXISTS update_last_active_on_login ON public.ip_logs;
CREATE TRIGGER update_last_active_on_login
AFTER INSERT ON public.ip_logs
FOR EACH ROW
EXECUTE FUNCTION public.record_user_login_and_activity();

-- ========================================================
-- 4. Populate existing last_active from IP logs
-- ========================================================

-- Update last_active for all profiles based on their most recent IP log
UPDATE public.profiles p
SET last_active = (
  SELECT MAX(created_at)
  FROM public.ip_logs
  WHERE user_id = p.id
)
WHERE (
  SELECT MAX(created_at)
  FROM public.ip_logs
  WHERE user_id = p.id
) IS NOT NULL;

-- ========================================================
-- 5. Handle auth events directly
-- ========================================================

-- Create a function to update last_active on auth events
CREATE OR REPLACE FUNCTION public.handle_auth_last_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user is signing in, update their last_active timestamp
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_active = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a trigger on the auth.users table for sign-ins
DROP TRIGGER IF EXISTS update_last_active_on_auth_signin ON auth.users;
CREATE TRIGGER update_last_active_on_auth_signin
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_last_active();

COMMIT;
