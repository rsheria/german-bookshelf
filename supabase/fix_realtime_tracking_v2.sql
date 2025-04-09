-- FIX REAL-TIME TRACKING CONNECTIONS - VERSION 2
-- This script fixes the connection between the tracking data and the front-end services
-- Modified to drop existing functions first to avoid return type errors

-- First, drop existing functions that we're going to modify
DROP FUNCTION IF EXISTS public.get_online_users(interval);
DROP FUNCTION IF EXISTS public.get_session_stats();
DROP FUNCTION IF EXISTS public.get_recent_activity(integer);
DROP FUNCTION IF EXISTS public.get_user_login_history(integer);
DROP FUNCTION IF EXISTS public.get_activity_stats();
DROP FUNCTION IF EXISTS public.set_activity_username();
DROP FUNCTION IF EXISTS public.track_user_activity(uuid, text, text, text, text, jsonb);

-- 1. Create the get_online_users function with new return type
CREATE OR REPLACE FUNCTION public.get_online_users(time_window interval DEFAULT interval '15 minutes')
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamptz,
  ip_address text,
  active_users bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    us.user_id,
    p.username,
    us.last_active_at as last_active,
    us.ip_address,
    COUNT(*) OVER() as active_users
  FROM 
    public.user_sessions us
  JOIN 
    public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - time_window)
  ORDER BY 
    us.last_active_at DESC;
$$;

-- 2. Create a function to get active session count
CREATE OR REPLACE FUNCTION public.get_session_stats()
RETURNS TABLE (
  active_users bigint,
  total_sessions bigint,
  last_hour_sessions bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COUNT(DISTINCT user_id) FILTER (WHERE is_active = true) as active_users,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE last_active_at >= NOW() - interval '1 hour') as last_hour_sessions
  FROM
    public.user_sessions;
$$;

-- 3. Ensure the activity_logs table has the username column for direct retrieval
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN username text;
    
    -- Update existing records with usernames
    UPDATE public.activity_logs al
    SET username = p.username
    FROM public.profiles p
    WHERE al.entity_id::uuid = p.id AND al.username IS NULL;
  END IF;
END
$$;

-- 4. Create a simplified function to retrieve recent activity that matches front-end expectations
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  action text,
  entity_name text,
  details jsonb,
  created_at timestamptz,
  ip_address text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    al.id,
    al.entity_id::uuid as user_id,
    COALESCE(al.username, p.username) as username,
    al.action,
    al.entity_name,
    al.details,
    al.created_at,
    al.ip_address
  FROM 
    public.activity_logs al
  LEFT JOIN
    public.profiles p ON al.entity_id::uuid = p.id
  ORDER BY 
    al.created_at DESC
  LIMIT 
    limit_count;
$$;

-- 5. Add database trigger to update activity_logs with username on insert
CREATE OR REPLACE FUNCTION public.set_activity_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If username is not already set, get it from profiles
  IF NEW.username IS NULL AND NEW.entity_type = 'user' THEN
    SELECT username INTO NEW.username
    FROM public.profiles
    WHERE id = NEW.entity_id::uuid;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS set_activity_username_trigger ON public.activity_logs;
CREATE TRIGGER set_activity_username_trigger
BEFORE INSERT ON public.activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_activity_username();

-- 6. Create a function to get activity statistics that preserves the original structure
CREATE OR REPLACE FUNCTION public.get_activity_stats() 
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_count integer;
  week_count integer;
  month_count integer;
  action_counts json;
BEGIN
  -- Get today's activity count
  SELECT COUNT(*) INTO today_count
  FROM public.activity_logs
  WHERE created_at >= (CURRENT_DATE);
  
  -- Get week's activity count
  SELECT COUNT(*) INTO week_count
  FROM public.activity_logs
  WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days');
  
  -- Get month's activity count
  SELECT COUNT(*) INTO month_count
  FROM public.activity_logs
  WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');
  
  -- Get count by action
  SELECT 
    json_object_agg(action, count)
  INTO action_counts
  FROM (
    SELECT action, COUNT(*) as count
    FROM public.activity_logs
    GROUP BY action
  ) action_counts;
  
  -- Return all stats as JSON
  RETURN json_build_object(
    'today', today_count,
    'week', week_count,
    'month', month_count,
    'byAction', COALESCE(action_counts, '{}'::json)
  );
END;
$$;

-- 7. Create a user login history function
CREATE OR REPLACE FUNCTION public.get_user_login_history(limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  action text,
  entity_name text,
  details jsonb,
  created_at timestamptz,
  ip_address text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    al.id,
    al.entity_id::uuid as user_id,
    COALESCE(al.username, p.username) as username,
    al.action,
    al.entity_name,
    al.details,
    al.created_at,
    al.ip_address
  FROM 
    public.activity_logs al
  LEFT JOIN
    public.profiles p ON al.entity_id::uuid = p.id
  WHERE
    al.action = 'login' OR al.action = 'LOGIN'
  ORDER BY 
    al.created_at DESC
  LIMIT 
    limit_count;
$$;

-- 8. Fix tracking function to ensure backward compatibility
CREATE OR REPLACE FUNCTION public.track_user_activity(
  p_user_id uuid,
  p_action text,
  p_entity_id text DEFAULT NULL,
  p_entity_type text DEFAULT 'user',
  p_entity_name text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id text;
  v_ip_address text;
  v_user_agent text;
  v_log_id uuid;
BEGIN
  -- Try to get current session info
  SELECT 
    session_id::text, ip_address, user_agent 
  INTO 
    v_session_id, v_ip_address, v_user_agent
  FROM 
    public.user_sessions
  WHERE 
    user_id = p_user_id AND is_active = true
  ORDER BY 
    last_active_at DESC
  LIMIT 1;
  
  -- Insert activity log
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    entity_name,
    details,
    created_at,
    session_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_entity_type,
    p_action,
    p_entity_name,
    p_details,
    NOW(),
    v_session_id,
    v_ip_address,
    v_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
