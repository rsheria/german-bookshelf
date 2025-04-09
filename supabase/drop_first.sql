-- DROP EXISTING FUNCTIONS FIRST
-- This ensures we can recreate them without parameter name conflicts

-- Drop all versions of functions we're going to recreate
DROP FUNCTION IF EXISTS public.update_user_last_active(uuid, uuid);
DROP FUNCTION IF EXISTS public.update_user_last_active_with_ip(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.get_user_activity(integer, uuid);
DROP FUNCTION IF EXISTS public.get_user_activity(integer, integer, uuid);

-- Now recreate update_user_last_active with consistent parameter names
CREATE FUNCTION public.update_user_last_active(
  p_user_id uuid,
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First check if session exists
  IF EXISTS (SELECT 1 FROM public.user_sessions WHERE user_id = p_user_id AND session_id = p_session_id) THEN
    -- Update existing session
    UPDATE public.user_sessions
    SET 
      last_active_at = now(),
      is_active = true
    WHERE 
      user_id = p_user_id AND 
      session_id = p_session_id;
  ELSE
    -- Insert new session
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      started_at,
      last_active_at,
      is_active
    )
    VALUES (
      p_user_id,
      p_session_id,
      now(),
      now(),
      true
    );
  END IF;
END;
$$;

-- Recreate update_user_last_active_with_ip
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
DECLARE
  v_username text;
BEGIN
  -- Get username
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = p_user_id;

  -- First check if session exists
  IF EXISTS (SELECT 1 FROM public.user_sessions WHERE user_id = p_user_id AND session_id = p_session_id) THEN
    -- Update existing session
    UPDATE public.user_sessions
    SET 
      last_active_at = now(),
      is_active = true,
      ip_address = p_ip_address,
      user_agent = p_user_agent
    WHERE 
      user_id = p_user_id AND 
      session_id = p_session_id;
  ELSE
    -- Insert new session
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      started_at,
      last_active_at,
      is_active,
      ip_address,
      user_agent
    )
    VALUES (
      p_user_id,
      p_session_id,
      now(),
      now(),
      true,
      p_ip_address,
      p_user_agent
    );
  END IF;
  
  -- Log the activity
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    ip_address,
    username,
    created_at
  ) VALUES (
    p_user_id::text,
    'user',
    'active',
    '{}'::jsonb,
    p_ip_address,
    v_username,
    now()
  );
END;
$$;

-- Recreate get_user_activity functions
CREATE FUNCTION public.get_user_activity(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL
)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.activity_logs
  WHERE 
    (p_user_id IS NULL OR entity_id = p_user_id::text)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

CREATE FUNCTION public.get_user_activity(
  limit_count integer,
  p_user_id uuid
)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.activity_logs
  WHERE entity_id = p_user_id::text
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;
