-- ADD SAMPLE LOGIN DATA AND ENSURE ONLINE USERS WORK

-- 1. First check if user_sessions table is empty or has no active sessions
DO $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Get count of active sessions
  SELECT COUNT(*) INTO active_count FROM public.user_sessions WHERE is_active = true;
  
  -- If no active sessions, insert some
  IF active_count = 0 THEN
    -- Get all user IDs
    FOR user_rec IN SELECT id, username FROM public.profiles LIMIT 5
    LOOP
      -- Create active session for each user
      INSERT INTO public.user_sessions (
        user_id,
        session_id,
        started_at,
        last_active_at,
        is_active,
        ip_address,
        user_agent
      ) VALUES (
        user_rec.id,
        uuid_generate_v4(),
        NOW() - interval '30 minutes',
        NOW() - interval '2 minutes',
        true,
        '127.0.0.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      );
      
      -- Create a LOGIN activity for each user
      INSERT INTO public.activity_logs (
        entity_id,
        entity_type,
        action,
        details,
        ip_address,
        username,
        created_at
      ) VALUES (
        user_rec.id::text,
        'user',
        'LOGIN',
        '{}'::jsonb,
        '127.0.0.1',
        user_rec.username,
        NOW() - interval '30 minutes'
      );
    END LOOP;
  END IF;
END;
$$;

-- 2. Re-create the get_online_users function to fix any issues
DROP FUNCTION IF EXISTS public.get_online_users();

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

-- 3. Make sure session tracking works correctly
CREATE OR REPLACE FUNCTION public.track_page_view_with_ip(
  p_user_id uuid,
  p_page_path text,
  p_session_id uuid,
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
  
  -- Also update last active timestamp (this is important for online users)
  UPDATE public.user_sessions
  SET 
    last_active_at = NOW(), 
    is_active = true,
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE 
    user_id = p_user_id AND 
    session_id = p_session_id;
    
  -- If no session exists, create one
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
