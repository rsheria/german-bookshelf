-- REAL TRACKING FIX
-- This creates the exact functions the frontend expects with the correct parameters

-- First remove any sample data
DELETE FROM public.user_sessions WHERE ip_address = '192.168.1.1';

-- 1. Create update_user_last_active_with_ip exactly as the frontend expects
CREATE OR REPLACE FUNCTION public.update_user_last_active_with_ip(
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
  SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;

  -- Create or update session
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
    COALESCE((SELECT started_at FROM public.user_sessions WHERE user_id = p_user_id AND session_id = p_session_id), NOW()),
    NOW(),
    true,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (user_id, session_id)
  DO UPDATE SET
    last_active_at = NOW(),
    is_active = true,
    ip_address = p_ip_address,
    user_agent = p_user_agent;
    
  -- Also log activity (but not too frequently)
  IF NOT EXISTS (
    SELECT 1 FROM public.activity_logs
    WHERE entity_id = p_user_id::text
      AND action = 'active'
      AND created_at > NOW() - interval '5 minutes'
  ) THEN
    INSERT INTO public.activity_logs (
      entity_id,
      entity_type,
      action,
      ip_address,
      username,
      created_at
    ) VALUES (
      p_user_id::text,
      'user',
      'active',
      p_ip_address,
      v_username,
      NOW()
    );
  END IF;
END;
$$;

-- 2. Create update_user_last_active as fallback
CREATE OR REPLACE FUNCTION public.update_user_last_active(
  p_user_id uuid,
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create or update session
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
    COALESCE((SELECT started_at FROM public.user_sessions WHERE user_id = p_user_id AND session_id = p_session_id), NOW()),
    NOW(),
    true
  )
  ON CONFLICT (user_id, session_id)
  DO UPDATE SET
    last_active_at = NOW(),
    is_active = true;
END;
$$;

-- 3. Create track_page_view_with_ip with all required parameters
CREATE OR REPLACE FUNCTION public.track_page_view_with_ip(
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
  -- Get username
  SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;

  -- Log page view
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
    'page_view',
    jsonb_build_object('page', p_page_path),
    p_ip_address,
    v_username,
    NOW()
  );
  
  -- Also update session
  UPDATE public.user_sessions
  SET 
    last_active_at = NOW(),
    is_active = true,
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE 
    user_id = p_user_id AND
    session_id = p_session_id;
    
  -- If no session, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      started_at,
      last_active_at,
      is_active,
      ip_address,
      user_agent
    ) VALUES (
      p_user_id,
      p_session_id,
      NOW(),
      NOW(),
      true,
      p_ip_address,
      p_user_agent
    );
  END IF;
END;
$$;

-- 4. Create track_page_view as fallback
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
  -- Get username
  SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;

  -- Log page view
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    username,
    created_at
  ) VALUES (
    p_user_id::text,
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    v_username,
    NOW()
  );
  
  -- Update session
  UPDATE public.user_sessions
  SET 
    last_active_at = NOW(),
    is_active = true
  WHERE 
    user_id = p_user_id AND
    session_id = p_session_id;
END;
$$;

-- 5. Create end_user_session_with_ip
CREATE OR REPLACE FUNCTION public.end_user_session_with_ip(
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
  SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;

  -- Log logout
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    created_at
  ) VALUES (
    p_user_id::text,
    'user',
    'LOGOUT',
    p_ip_address,
    v_username,
    NOW()
  );
  
  -- End session
  UPDATE public.user_sessions
  SET
    is_active = false,
    ended_at = NOW(),
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE
    user_id = p_user_id AND
    session_id = p_session_id;
END;
$$;

-- 6. Create end_user_session as fallback
CREATE OR REPLACE FUNCTION public.end_user_session(
  p_user_id uuid,
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- End session
  UPDATE public.user_sessions
  SET
    is_active = false,
    ended_at = NOW()
  WHERE
    user_id = p_user_id AND
    session_id = p_session_id;
END;
$$;

-- 7. Create/update get_online_users that uses the actual session data
CREATE OR REPLACE FUNCTION public.get_online_users()
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

-- 8. Create/update get_recent_activity to show actual activities
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count integer DEFAULT 10)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.activity_logs
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;

-- 9. Create additional function for login tracking
CREATE OR REPLACE FUNCTION public.log_user_login(
  p_user_id uuid,
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
  -- Get username
  SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;

  -- Log login activity
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    created_at
  ) VALUES (
    p_user_id::text,
    'user',
    'LOGIN',
    p_ip_address,
    v_username,
    NOW()
  );
END;
$$;
