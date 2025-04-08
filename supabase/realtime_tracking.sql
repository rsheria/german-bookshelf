-- REALTIME USER TRACKING SYSTEM
-- This creates a proper real-time tracking system for users who are actually online

-- ==========================================
-- STEP 1: CLEAR OUT ALL TEST DATA
-- ==========================================

-- Remove ALL existing sessions to start fresh
TRUNCATE TABLE public.user_sessions;

-- Remove any test activities
DELETE FROM public.activity_logs 
WHERE entity_type = 'USER' AND action IN ('LOGIN', 'ACTIVE') 
AND created_at < now() - interval '1 hour';

-- ==========================================
-- STEP 2: CREATE TRACKING FUNCTIONS
-- ==========================================

-- Function to track user sessions in real-time
DROP FUNCTION IF EXISTS public.update_user_last_active(uuid, text);
DROP FUNCTION IF EXISTS public.track_user_session(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.update_user_last_active(
  p_user_id UUID,
  p_session_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
  success BOOLEAN := FALSE;
BEGIN
  -- Get IP and user agent from request headers
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    ip_addr := 'unknown';
  END;
  
  BEGIN
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    user_agent_str := 'unknown';
  END;

  -- Update the session if it exists
  UPDATE public.user_sessions
  SET 
    last_active_at = now(),
    is_active = true,
    ip_address = COALESCE(ip_address, ip_addr),
    user_agent = COALESCE(user_agent, user_agent_str)
  WHERE 
    user_id = p_user_id AND 
    session_id = p_session_id;
  
  -- If session doesn't exist, create a new one
  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.user_sessions (
        user_id,
        session_id,
        ip_address,
        user_agent,
        started_at,
        last_active_at,
        is_active
      )
      VALUES (
        p_user_id,
        p_session_id,
        ip_addr,
        user_agent_str,
        now(),
        now(),
        true
      );
      success := TRUE;
    EXCEPTION WHEN OTHERS THEN
      success := FALSE;
    END;
  ELSE
    success := TRUE;
  END IF;

  -- Track this activity in logs (but not too frequently)
  IF success AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    -- Only log activity once every 5 minutes per user to avoid spam
    IF NOT EXISTS (
      SELECT 1 FROM public.activity_logs
      WHERE 
        user_id = p_user_id AND
        action = 'ACTIVE' AND
        created_at > now() - interval '5 minutes'
    ) THEN
      BEGIN
        INSERT INTO public.activity_logs (
          user_id,
          username,
          action,
          entity_id,
          entity_type,
          details,
          ip_address,
          user_agent
        )
        SELECT
          p_user_id,
          p.username,
          'ACTIVE',
          p_user_id::TEXT,
          'USER',
          jsonb_build_object(
            'session_id', p_session_id,
            'timestamp', now()
          ),
          ip_addr,
          user_agent_str
        FROM public.profiles p
        WHERE p.id = p_user_id;
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors in activity logging
        NULL;
      END;
    END IF;
  END IF;

  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create alias for compatibility
CREATE OR REPLACE FUNCTION public.track_user_session(
  p_user_id UUID,
  p_session_id TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.update_user_last_active(p_user_id, p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track page views
DROP FUNCTION IF EXISTS public.track_page_view(uuid, text, text);

CREATE OR REPLACE FUNCTION public.track_page_view(
  p_user_id UUID,
  p_page_path TEXT,
  p_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
  actual_session_id TEXT;
  success BOOLEAN := FALSE;
BEGIN
  -- Get IP and user agent from request headers
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    ip_addr := 'unknown';
  END;
  
  BEGIN
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    user_agent_str := 'unknown';
  END;
  
  -- Use provided session ID or generate one
  actual_session_id := COALESCE(p_session_id, 'session-' || p_user_id::text || '-' || extract(epoch from now())::text);
  
  -- Update user's last active status
  PERFORM public.update_user_last_active(p_user_id, actual_session_id);
  
  -- Track the page view in activity logs
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    BEGIN
      INSERT INTO public.activity_logs (
        user_id,
        username,
        action,
        entity_id,
        entity_type,
        details,
        ip_address,
        user_agent
      )
      SELECT
        p_user_id,
        p.username,
        'PAGE_VIEW',
        p_page_path,
        'PAGE',
        jsonb_build_object(
          'page_path', p_page_path,
          'view_time', now()
        ),
        ip_addr,
        user_agent_str
      FROM public.profiles p
      WHERE p.id = p_user_id;
      
      success := TRUE;
    EXCEPTION WHEN OTHERS THEN
      success := FALSE;
    END;
  END IF;

  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end user session
DROP FUNCTION IF EXISTS public.end_user_session(uuid, text);

CREATE OR REPLACE FUNCTION public.end_user_session(
  p_user_id UUID,
  p_session_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Mark session as inactive
  UPDATE public.user_sessions
  SET 
    ended_at = now(),
    is_active = false
  WHERE 
    user_id = p_user_id AND 
    session_id = p_session_id;
  
  IF FOUND THEN
    success := TRUE;
    
    -- Log logout action
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'activity_logs'
    ) THEN
      BEGIN
        INSERT INTO public.activity_logs (
          user_id,
          username,
          action,
          entity_id,
          entity_type,
          details
        )
        SELECT
          p_user_id,
          p.username,
          'LOGOUT',
          p_user_id::TEXT,
          'USER',
          jsonb_build_object(
            'session_id', p_session_id,
            'timestamp', now()
          )
        FROM public.profiles p
        WHERE p.id = p_user_id;
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors in activity logging
        NULL;
      END;
    END IF;
  END IF;

  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get online users
DROP FUNCTION IF EXISTS public.get_online_users(interval);

CREATE OR REPLACE FUNCTION public.get_online_users(time_window interval DEFAULT interval '15 minutes')
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  ip_address TEXT
) AS $$
BEGIN
  -- First mark inactive sessions
  UPDATE public.user_sessions
  SET is_active = false
  WHERE last_active_at < (now() - time_window);

  -- Return only truly active users
  RETURN QUERY
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active,
    us.ip_address
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - time_window)
  ORDER BY us.user_id, us.last_active_at DESC;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 3: CREATE AUTH TRIGGER FOR LOGIN TRACKING
-- ==========================================

-- Create function to track logins through auth trigger
DROP FUNCTION IF EXISTS public.on_auth_user_login();

CREATE OR REPLACE FUNCTION public.on_auth_user_login()
RETURNS TRIGGER AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
  session_id TEXT;
BEGIN
  -- Get IP and user agent
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    ip_addr := 'unknown';
  END;
  
  BEGIN
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    user_agent_str := 'unknown';
  END;

  -- Generate session ID for this login
  session_id := 'login-' || NEW.id::text || '-' || extract(epoch from now())::text;
  
  -- Record IP address
  BEGIN
    INSERT INTO public.ip_logs (
      user_id,
      ip_address,
      user_agent
    )
    VALUES (
      NEW.id,
      ip_addr,
      user_agent_str
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Continue even if this fails
  END;
  
  -- Log the login activity
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    BEGIN
      INSERT INTO public.activity_logs (
        user_id,
        username,
        action,
        entity_id,
        entity_type,
        details,
        ip_address,
        user_agent
      )
      SELECT
        NEW.id,
        p.username,
        'LOGIN',
        NEW.id::TEXT,
        'USER',
        jsonb_build_object(
          'login_time', now(),
          'email', NEW.email
        ),
        ip_addr,
        user_agent_str
      FROM public.profiles p
      WHERE p.id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Continue even if this fails
    END;
  END IF;
  
  -- Create a new session
  BEGIN
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      ip_address,
      user_agent,
      started_at,
      last_active_at,
      is_active
    )
    VALUES (
      NEW.id,
      session_id,
      ip_addr,
      user_agent_str,
      now(),
      now(),
      true
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Continue even if this fails
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Always return NEW to prevent auth issues
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

DO $$
BEGIN
  CREATE TRIGGER on_auth_user_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION public.on_auth_user_login();
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors (might not have permission)
  NULL;
END
$$;

-- ==========================================
-- STEP 4: GRANT PERMISSIONS
-- ==========================================

-- Grant execute permissions to all functions
GRANT EXECUTE ON FUNCTION public.update_user_last_active(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_user_session(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_page_view(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.end_user_session(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_online_users(interval) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.on_auth_user_login() TO service_role;
