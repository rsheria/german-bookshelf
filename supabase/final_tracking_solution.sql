-- COMPLETE USER TRACKING SOLUTION
-- Fixes both IP logging and last_active timestamp updating

BEGIN;

-- ===============================================
-- Part 1: Fix IP Logging 
-- ===============================================

-- First, ensure that the ip_logs table allows all users to insert records
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

-- Remove any conflicting policies
DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin has full access to IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow inserting IP logs" ON public.ip_logs;

-- Create the necessary policies
CREATE POLICY "Allow any user to insert their own IP logs" ON public.ip_logs
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow admins full access to all IP logs" ON public.ip_logs
FOR ALL
USING (is_admin());

CREATE POLICY "Allow users to view their own IP logs" ON public.ip_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Create or replace the IP logging function
CREATE OR REPLACE FUNCTION public.record_user_ip(
  p_user_id uuid,
  p_ip_address text,
  p_user_agent text,
  p_action text DEFAULT 'LOGIN'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.ip_logs (user_id, ip_address, user_agent, action, created_at)
  VALUES (p_user_id, p_ip_address, p_user_agent, p_action, NOW())
  RETURNING id INTO v_log_id;
  
  -- Update the last_active timestamp in profiles
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = p_user_id;
  
  RETURN v_log_id;
END;
$$;

-- ===============================================
-- Part 2: Fix Last Active Tracking
-- ===============================================

-- Create or replace the trigger function to update last_active
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

-- Create the trigger on ip_logs
DROP TRIGGER IF EXISTS update_last_active_trigger ON public.ip_logs;
CREATE TRIGGER update_last_active_trigger
AFTER INSERT ON public.ip_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_last_active_on_ip_log();

-- Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove any conflicting policies
DROP POLICY IF EXISTS "Users can update their last_active" ON public.profiles;
DROP POLICY IF EXISTS "Admin has full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can access their own profile" ON public.profiles;

-- Create policies for the profiles table
CREATE POLICY "Admin has full access to profiles" ON public.profiles
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can access their own profile" ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create a special policy to allow the record_user_ip function to update last_active
-- This is necessary because the function is used by all users
CREATE POLICY "System functions can update last_active" ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- ===============================================
-- Part 3: Fix Admin Dashboard View
-- ===============================================

-- Drop existing function to avoid errors
DROP FUNCTION IF EXISTS public.admin_get_profiles(text, text, timestamp without time zone, timestamp without time zone, integer, integer, text);
DROP FUNCTION IF EXISTS public.admin_get_profiles(text, text, timestamp with time zone, timestamp with time zone, integer, integer, text);
DROP FUNCTION IF EXISTS public.admin_get_profiles;

-- Create a view for admin dashboard
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  p.id,
  p.username,
  p.is_admin,
  p.created_at,
  p.daily_quota,
  p.monthly_request_quota,
  p.last_active,
  p.avatar_url,
  COALESCE(p.subscription_plan, 'free') as subscription_plan,
  COALESCE(p.referrals_count, 0) as referrals_count,
  p.referral_code,
  u.email
FROM 
  public.profiles p
LEFT JOIN 
  auth.users u ON p.id = u.id;

-- Create the admin_get_profiles function that uses the view
CREATE OR REPLACE FUNCTION public.admin_get_profiles(
  search_term text DEFAULT NULL,
  role_filter text DEFAULT NULL,
  date_from timestamp DEFAULT NULL,
  date_to timestamp DEFAULT NULL,
  page_from integer DEFAULT 0,
  page_to integer DEFAULT 9,
  sort_order text DEFAULT 'desc'
)
RETURNS TABLE (
  id uuid,
  username text,
  is_admin boolean,
  created_at timestamp with time zone,
  daily_quota integer,
  monthly_request_quota integer,
  last_active timestamp with time zone,
  avatar_url text,
  subscription_plan text,
  referrals_count integer,
  referral_code text,
  email text,
  count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.is_admin,
    p.created_at,
    p.daily_quota,
    p.monthly_request_quota,
    p.last_active,
    p.avatar_url,
    p.subscription_plan,
    p.referrals_count,
    p.referral_code,
    p.email,
    count(*) OVER() as count
  FROM admin_users_view p
  WHERE
    (search_term IS NULL OR 
     p.username ILIKE '%' || search_term || '%' OR 
     p.email ILIKE '%' || search_term || '%')
    AND
    (role_filter IS NULL OR 
     (role_filter = 'admin' AND p.is_admin = true) OR
     (role_filter = 'user' AND p.is_admin = false))
    AND
    (date_from IS NULL OR p.created_at >= date_from)
    AND
    (date_to IS NULL OR p.created_at <= date_to)
  ORDER BY 
    CASE WHEN sort_order = 'desc' THEN p.created_at END DESC,
    CASE WHEN sort_order = 'asc' THEN p.created_at END ASC
  LIMIT (page_to - page_from + 1)
  OFFSET page_from;
END;
$$;

-- ===============================================
-- Part 4: Test Last Active Updates
-- ===============================================

-- Create a convenient function to manually update last_active for testing
CREATE OR REPLACE FUNCTION public.manual_update_last_active(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = user_id_param;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.record_user_ip TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_update_last_active TO authenticated;

-- Update all existing users with null last_active based on their IP logs
UPDATE public.profiles p
SET last_active = (
  SELECT MAX(created_at)
  FROM public.ip_logs
  WHERE user_id = p.id
)
WHERE last_active IS NULL
AND id IN (
  SELECT DISTINCT user_id 
  FROM public.ip_logs
);

-- For remaining users with no last_active and no IP logs, use their last sign-in time
UPDATE public.profiles p
SET last_active = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id
AND p.last_active IS NULL
AND u.last_sign_in_at IS NOT NULL;

COMMIT;
