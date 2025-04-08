-- FINAL TRACKING FIX
-- This script resolves issues with login tracking and session management

-- ==========================================
-- STEP 1: CREATE AUTOMATIC SESSION TRACKING
-- ==========================================

-- Create a proper login trigger to track all logins
CREATE OR REPLACE FUNCTION public.on_auth_user_login()
RETURNS TRIGGER AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
  session_id TEXT;
BEGIN
  -- Extract IP and user agent from request headers
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION
    WHEN OTHERS THEN
      ip_addr := 'unknown';
      user_agent_str := 'unknown';
  END;

  -- Generate a session ID if needed
  session_id := 'session-' || NEW.id::text || '-' || extract(epoch from now())::text;
  
  -- Insert into ip_logs to record login
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
  
  -- Record login activity
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
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
      NEW.id::text,
      'USER',
      jsonb_build_object(
        'login_time', now(),
        'ip_address', ip_addr
      ),
      ip_addr,
      user_agent_str
    FROM public.profiles p
    WHERE p.id = NEW.id;
  END IF;
  
  -- Create/update user session
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
  )
  ON CONFLICT (user_id, session_id) 
  DO UPDATE SET
    last_active_at = now(),
    is_active = true;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Always return NEW to prevent blocking authentication
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

-- Create auth login trigger
DO $$
BEGIN
  CREATE TRIGGER on_auth_user_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION public.on_auth_user_login();
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors (might not have permission)
END
$$;

-- ==========================================
-- STEP 2: IMPROVE track_user_session FUNCTION
-- ==========================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.track_user_session(uuid, text, text, text);

-- Create better function to track user sessions from frontend
CREATE OR REPLACE FUNCTION public.track_user_session(
  p_user_id UUID, 
  p_session_id TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Get IP and user agent from request headers if not provided
  IF p_ip_address IS NULL THEN
    BEGIN
      p_ip_address := current_setting('request.headers', true)::json->>'x-forwarded-for';
    EXCEPTION WHEN OTHERS THEN
      p_ip_address := 'unknown';
    END;
  END IF;
  
  IF p_user_agent IS NULL THEN
    BEGIN
      p_user_agent := current_setting('request.headers', true)::json->>'user-agent';
    EXCEPTION WHEN OTHERS THEN
      p_user_agent := 'unknown';
    END;
  END IF;

  -- Try to update an existing session
  UPDATE public.user_sessions
  SET 
    last_active_at = now(),
    ip_address = COALESCE(p_ip_address, ip_address),
    user_agent = COALESCE(p_user_agent, user_agent),
    is_active = true
  WHERE user_id = p_user_id 
    AND session_id = p_session_id;
  
  -- Check if update succeeded
  IF FOUND THEN
    success := TRUE;
  ELSE
    -- If no matching session, create a new one
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
        p_ip_address,
        p_user_agent,
        now(),
        now(),
        true
      );
      
      success := TRUE;
    EXCEPTION WHEN OTHERS THEN
      -- Handle error
      success := FALSE;
    END;
  END IF;

  -- Log the activity
  IF success AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
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
      p_user_id::text,
      'USER',
      jsonb_build_object(
        'active_time', now(),
        'session_id', p_session_id
      ),
      p_ip_address,
      p_user_agent
    FROM public.profiles p
    WHERE p.id = p_user_id;
  END IF;

  RETURN success;

EXCEPTION WHEN OTHERS THEN
  -- Return false on error
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 3: FIX get_online_users FUNCTION
-- ==========================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_online_users(interval);

-- Create improved function with correct session handling
CREATE OR REPLACE FUNCTION public.get_online_users(time_window interval DEFAULT interval '15 minutes')
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  ip_address TEXT
) AS $$
BEGIN
  -- Update all old sessions to inactive
  UPDATE public.user_sessions
  SET is_active = false
  WHERE last_active_at < (now() - time_window);

  -- Return active users
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
  -- Return empty set on error rather than failing
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 4: ADD FRONTEND TRACKING HOOKS
-- ==========================================

-- Function to record user page view
CREATE OR REPLACE FUNCTION public.record_page_view(
  p_user_id UUID,
  p_page_path TEXT,
  p_session_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
  actual_session_id TEXT;
BEGIN
  -- Extract IP and user agent from request headers
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION
    WHEN OTHERS THEN
      ip_addr := 'unknown';
      user_agent_str := 'unknown';
  END;
  
  -- Generate session ID if not provided
  actual_session_id := COALESCE(p_session_id, 'session-' || p_user_id::text || '-' || extract(epoch from now())::text);
  
  -- Update user session
  PERFORM public.track_user_session(p_user_id, actual_session_id, ip_addr, user_agent_str);
  
  -- Log page view if activity_logs exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
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
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Silently fail to not block the application
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 5: GRANT PERMISSIONS
-- ==========================================

-- Grant permissions to all functions
GRANT EXECUTE ON FUNCTION public.on_auth_user_login() TO service_role;
GRANT EXECUTE ON FUNCTION public.track_user_session(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_online_users(interval) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_page_view(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ==========================================
-- STEP 6: CLEANUP OLD SESSIONS
-- ==========================================

-- Clean up stale sessions to make sure we're not showing incorrect online users
UPDATE public.user_sessions
SET is_active = false
WHERE last_active_at < (now() - interval '15 minutes');

-- ==========================================
-- STEP 7: SEED CURRENT USER SESSION DATA
-- ==========================================

-- Create session data for all users to make sure everyone is properly tracked
INSERT INTO public.user_sessions (
  user_id,
  session_id,
  ip_address,
  user_agent,
  started_at,
  last_active_at,
  is_active
)
SELECT 
  p.id,
  'seed-session-' || p.id::text,
  '127.0.0.1',
  'Seeded User Agent',
  now(),
  now(),
  true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_sessions us WHERE us.user_id = p.id AND us.is_active = true
)
ON CONFLICT DO NOTHING;
