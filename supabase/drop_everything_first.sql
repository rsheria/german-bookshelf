-- DROP EVERYTHING FIRST APPROACH
-- This script first drops ALL relevant functions and then recreates only what's needed

-- Drop all functions that we might be modifying
DROP FUNCTION IF EXISTS public.get_online_users();
DROP FUNCTION IF EXISTS public.get_online_profiles(integer);
DROP FUNCTION IF EXISTS public.update_user_last_active(uuid, uuid);
DROP FUNCTION IF EXISTS public.update_user_last_active_with_ip(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, uuid, text, text);
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.track_page_view(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_user_activity(integer, uuid);
DROP FUNCTION IF EXISTS public.get_user_activity(integer, integer, uuid);
DROP FUNCTION IF EXISTS public.get_recent_activity(integer);
DROP FUNCTION IF EXISTS public.get_activity_stats();
DROP FUNCTION IF EXISTS public.get_user_details(uuid);
DROP FUNCTION IF EXISTS public.end_user_session_with_ip(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.end_user_session(uuid, uuid);

-- Now create ONLY the essential functions with their correct signatures

-- 1. Main function for tracking user activity with IP
CREATE FUNCTION public.update_user_last_active_with_ip(
  p_user_id uuid,
  p_session_id uuid,
  p_ip_address text,
  p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update session with IP address
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

-- 2. Get online users
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

-- 3. Track page view function with correct parameters
CREATE FUNCTION public.track_page_view_with_ip(
  p_user_id uuid,
  p_page_path text,
  p_session_id uuid,
  p_ip_address text,
  p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
BEGIN
  -- Get username for the user
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = p_user_id;

  -- Insert activity log
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    ip_address,
    created_at,
    username
  ) VALUES (
    p_user_id::text,
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    p_ip_address,
    NOW(),
    v_username
  );
END;
$$;

-- 4. Get recent activity function
CREATE FUNCTION public.get_recent_activity(limit_count integer DEFAULT 10)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.activity_logs
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;
