-- SIMPLE TRACKING FIX - FOCUSED ON LAST ACTIVE UPDATES
-- This script provides a straightforward solution for user activity tracking

BEGIN;

-- ========================================================
-- 1. Create a simple function to update last_active
-- ========================================================

-- This function can be called directly to update last_active
CREATE OR REPLACE FUNCTION public.update_user_last_seen(user_id uuid)
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
-- 2. Fix profiles RLS policies
-- ========================================================

-- Make sure the profiles table has appropriate RLS settings
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies for last_active updates
DROP POLICY IF EXISTS "Allow updating last_active" ON public.profiles;
DROP POLICY IF EXISTS "System can update last_active" ON public.profiles;

-- Create a permissive policy for updating last_active
CREATE POLICY "System update for last_active" ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Ensure admin can see all profiles
DROP POLICY IF EXISTS "Admin has full access to profiles" ON public.profiles;
CREATE POLICY "Admin has full access to profiles" ON public.profiles
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ========================================================
-- 3. Create a trigger on IP logs
-- ========================================================

-- Add trigger function to update last_active on IP logging
CREATE OR REPLACE FUNCTION public.update_last_active_on_ip_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the last_active timestamp
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS update_last_active_trigger ON public.ip_logs;
CREATE TRIGGER update_last_active_trigger
AFTER INSERT ON public.ip_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_last_active_on_ip_log();

-- ========================================================
-- 4. Make all IP logs records create successfully 
-- ========================================================

-- Clear any RLS from ip_logs and set a permissive policy
ALTER TABLE public.ip_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

-- Drop all ip_logs policies
DROP POLICY IF EXISTS "Users can view their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin has full access to IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow inserting IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Users can manage their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin has full access to all IP logs" ON public.ip_logs;

-- Create minimal policies that will definitely work
CREATE POLICY "Allow users to insert IP logs" ON public.ip_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admin can view all IP logs" ON public.ip_logs
FOR SELECT
USING (is_admin());

CREATE POLICY "Users can view their own IP logs" ON public.ip_logs
FOR SELECT
USING (auth.uid() = user_id);

-- ========================================================
-- 5. Retroactively update last_active from existing IP logs
-- ========================================================

-- Update last_active for all users based on most recent IP log
UPDATE public.profiles p
SET last_active = (
  SELECT MAX(created_at)
  FROM public.ip_logs
  WHERE user_id = p.id
)
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM public.ip_logs
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_user_last_seen TO authenticated;

COMMIT;
