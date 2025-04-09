-- PARAMETER FIX
-- This fixes the parameter mismatch between frontend and SQL functions

-- Drop the problematic functions
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.update_user_last_active_with_ip(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.end_user_session_with_ip(uuid, uuid, text, text);

-- Create track_page_view_with_ip WITH THE CORRECT PARAMETERS to match the frontend code
CREATE FUNCTION public.track_page_view_with_ip(
  p_user_id uuid,
  p_page_path text,
  p_session_id uuid,  -- This parameter was missing
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
  
  -- Also update the user's last active status
  UPDATE public.user_sessions
  SET 
    last_active_at = NOW(),
    is_active = true,
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE 
    user_id = p_user_id AND
    session_id = p_session_id;
END;
$$;

-- Create the basic track_page_view function as a fallback
CREATE OR REPLACE FUNCTION public.track_page_view(
  p_user_id uuid,
  p_page_path text,
  p_session_id uuid
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
    created_at,
    username
  ) VALUES (
    p_user_id::text,
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    NOW(),
    v_username
  );
  
  -- Also update last active timestamp
  UPDATE public.user_sessions
  SET last_active_at = NOW(), is_active = true
  WHERE user_id = p_user_id AND session_id = p_session_id;
END;
$$;

-- Create end_user_session_with_ip function
CREATE OR REPLACE FUNCTION public.end_user_session_with_ip(
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
  UPDATE public.user_sessions
  SET
    is_active = false,
    ended_at = now(),
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE
    user_id = p_user_id AND
    session_id = p_session_id;
END;
$$;
