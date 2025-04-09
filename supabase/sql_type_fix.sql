-- SQL TYPE FIX
-- This specifically addresses the UUID type error

-- Drop problematic functions
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.get_recent_activity(integer);

-- Fix the track_page_view_with_ip function to handle parameters correctly
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
    p_user_id::text, -- Convert to text as entity_id is text type
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

-- Fix the get_recent_activity function with correct type handling
CREATE FUNCTION public.get_recent_activity(limit_count integer DEFAULT 10)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Simply return the raw activity logs to avoid any type conversion issues
  SELECT *
  FROM public.activity_logs
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;
