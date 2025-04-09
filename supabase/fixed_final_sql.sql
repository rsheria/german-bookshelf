-- FIXED FINAL SQL SCRIPT
-- This addresses the exact errors from the console logs

-- Drop conflicting triggers and functions first
DROP TRIGGER IF EXISTS ensure_activity_username_trigger ON public.activity_logs;
DROP TRIGGER IF EXISTS set_activity_username_trigger ON public.activity_logs;
DROP FUNCTION IF EXISTS public.ensure_activity_username();
DROP FUNCTION IF EXISTS public.set_activity_username();
DROP FUNCTION IF EXISTS public.get_online_users(interval);
DROP FUNCTION IF EXISTS public.get_online_users();
DROP FUNCTION IF EXISTS public.update_user_last_active_with_ip(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.get_activity_stats();
DROP FUNCTION IF EXISTS public.get_recent_activity(integer);

-- 1. Create a clean get_online_users function with NO PARAMETER OVERLOADS
CREATE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - interval '15 minutes')
  ORDER BY us.user_id, us.last_active_at DESC;
$$;

-- 2. Create a compatible version of track_page_view_with_ip
CREATE FUNCTION public.track_page_view_with_ip(
  p_user_id uuid,
  p_page_path text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_username text;
BEGIN
  -- Get the username
  SELECT username INTO v_username
  FROM profiles
  WHERE id = p_user_id;

  -- Log the page view in activity logs
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    created_at,
    ip_address,
    username
  ) VALUES (
    p_user_id,
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    NOW(),
    p_ip_address,
    v_username
  );
  
  -- Also update the user's last active status
  UPDATE public.user_sessions
  SET 
    last_active_at = NOW(),
    is_active = true,
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE 
    user_id = p_user_id AND
    is_active = true;
END;
$$;

-- 3. Create a compatible version of update_user_last_active_with_ip
CREATE FUNCTION public.update_user_last_active_with_ip(
  p_user_id uuid,
  p_session_id uuid,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_sessions (
    user_id,
    session_id,
    last_active_at,
    is_active,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_session_id,
    now(),
    true,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (user_id, session_id) 
  DO UPDATE SET 
    last_active_at = now(),
    is_active = true,
    ip_address = p_ip_address,
    user_agent = p_user_agent;
END;
$$;

-- 4. Create a get_recent_activity function that matches the expected signature
CREATE FUNCTION public.get_recent_activity(limit_count integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  action text,
  entity_id text,
  entity_type text,
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
    al.entity_id,
    al.entity_type,
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

-- 5. Create a get_activity_stats function
CREATE FUNCTION public.get_activity_stats()
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

-- 6. Make sure username column exists and is populated
DO $$
BEGIN
  -- Add username column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN username text;
  END IF;
  
  -- Update existing activities with usernames
  UPDATE public.activity_logs al
  SET username = p.username
  FROM public.profiles p
  WHERE al.entity_id::uuid = p.id AND al.username IS NULL;
END;
$$;
