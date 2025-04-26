-- COMPREHENSIVE FIX FOR LAST_ACTIVE TRACKING
-- This script fixes last_active tracking for ALL users, including non-admin users

BEGIN;

-- ========================================================
-- 1. Create a proper view for tracking online users
-- ========================================================

-- Create or replace the view for online users
CREATE OR REPLACE VIEW public.online_users AS
SELECT 
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.is_admin,
  p.daily_quota,
  p.monthly_request_quota,
  p.last_active
FROM 
  public.profiles p
WHERE 
  p.last_active > (NOW() - INTERVAL '15 minutes');
  
-- Drop if the view exists before trying to modify it
DROP FUNCTION IF EXISTS public.get_online_users();


-- ========================================================
-- 2. Fix trigger for updating last_active
-- ========================================================

-- Create function to update last_active for any user
CREATE OR REPLACE FUNCTION public.update_user_last_active_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Add trigger to ip_logs 
DROP TRIGGER IF EXISTS update_last_active_on_ip_log ON public.ip_logs;
CREATE TRIGGER update_last_active_on_ip_log
AFTER INSERT ON public.ip_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_user_last_active_trigger();

-- ========================================================
-- 3. Fix profiles table RLS policies
-- ========================================================

-- Create special policy to allow updating last_active for ANY user
DROP POLICY IF EXISTS "Allow system to update last_active" ON public.profiles;
CREATE POLICY "Allow system to update last_active" ON public.profiles
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Ensure admins have full access
DROP POLICY IF EXISTS "Admin has full access to profiles" ON public.profiles; 
CREATE POLICY "Admin has full access to profiles" ON public.profiles
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Make sure normal users can view/update their own profiles
DROP POLICY IF EXISTS "Users can access their own profile" ON public.profiles;
CREATE POLICY "Users can access their own profile" ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ========================================================
-- 4. Create helper functions to ensure last_active works
-- ========================================================

-- Create a standalone function to update last_active, callable from frontend
CREATE OR REPLACE FUNCTION public.manual_update_last_active(uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = uid;
END;
$$;

-- ========================================================
-- 5. Create online users RPC function to get accurate data
-- ========================================================

CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS SETOF public.online_users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.online_users WHERE last_active IS NOT NULL;
$$;

-- ========================================================
-- 6. Populate current last_active for all users
-- ========================================================

-- Use existing IP logs to populate last_active for all users
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

-- For users without IP logs, set to their last sign in time from auth.users
UPDATE public.profiles p
SET last_active = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id
AND p.last_active IS NULL
AND u.last_sign_in_at IS NOT NULL;

-- ========================================================
-- 7. Grant necessary permissions
-- ========================================================

-- Grant permission for authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.manual_update_last_active TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_users TO authenticated;

COMMIT;
