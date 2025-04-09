-- TYPE ERROR FIX
-- This specifically fixes the "invalid input syntax for type uuid" error

-- Drop the problematic functions
DROP FUNCTION IF EXISTS public.get_recent_activity(integer);
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, text, text);

-- Create a simplified get_recent_activity that avoids type conversions
CREATE FUNCTION public.get_recent_activity(limit_count integer DEFAULT 10)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Directly return activity logs to avoid any UUID conversion issues
  SELECT *
  FROM public.activity_logs
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;

-- Create a fixed track_page_view function that handles parameters correctly
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
  v_username text;
BEGIN
  -- Get username for the user
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = p_user_id;

  -- Insert activity log (using entity_id as text to avoid type issues)
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    ip_address,
    created_at,
    username
  ) VALUES (
    p_user_id::text,  -- Convert UUID to text for storage
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    p_ip_address,
    NOW(),
    v_username
  );
  
  -- Also update last active timestamp
  UPDATE public.user_sessions
  SET last_active_at = NOW(), is_active = true
  WHERE user_id = p_user_id AND is_active = true;
END;
$$;
