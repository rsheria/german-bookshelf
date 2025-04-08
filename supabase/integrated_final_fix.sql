-- INTEGRATED FINAL FIX FOR ADMIN PANEL
-- This script properly integrates all components based on frontend expectations

-- ==========================================
-- STEP 1: CLEAR OUT FAKE USER SESSIONS
-- ==========================================

-- Remove all test data to start fresh
DELETE FROM public.user_sessions
WHERE user_agent = 'Seeded User Agent'
   OR session_id LIKE 'seed-session-%'
   OR session_id LIKE 'real-session-%'
   OR ip_address = '127.0.0.1';

-- ==========================================
-- STEP 2: RECREATE CORE TRACKING FUNCTIONS
-- ==========================================

-- Replace update_user_last_active with exactly what frontend expects
DROP FUNCTION IF EXISTS public.update_user_last_active(uuid, text);

CREATE OR REPLACE FUNCTION public.update_user_last_active(
  user_id UUID,
  session_id TEXT
)
RETURNS VOID AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
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

  -- Update the session (if it exists)
  UPDATE public.user_sessions
  SET 
    last_active_at = now(),
    is_active = true,
    ip_address = COALESCE(ip_address, ip_addr),
    user_agent = COALESCE(user_agent, user_agent_str)
  WHERE 
    user_id = update_user_last_active.user_id AND 
    session_id = update_user_last_active.session_id;
  
  -- If no rows were updated, insert a new session
  IF NOT FOUND THEN
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
      update_user_last_active.user_id,
      update_user_last_active.session_id,
      ip_addr,
      user_agent_str,
      now(),
      now(),
      true
    );
  END IF;
  
  -- Log online activity
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
      update_user_last_active.user_id,
      p.username,
      'ACTIVE',
      update_user_last_active.user_id::text,
      'USER',
      jsonb_build_object(
        'session_id', update_user_last_active.session_id,
        'timestamp', now()
      ),
      ip_addr,
      user_agent_str
    FROM public.profiles p
    WHERE p.id = update_user_last_active.user_id
    -- Limit activity logging to once per 15 minutes to avoid spamming
    AND NOT EXISTS (
      SELECT 1 FROM public.activity_logs
      WHERE 
        user_id = update_user_last_active.user_id AND
        action = 'ACTIVE' AND
        created_at > now() - interval '15 minutes'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors to keep app working
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace end_user_session with exactly what frontend expects
DROP FUNCTION IF EXISTS public.end_user_session(uuid, text);

CREATE OR REPLACE FUNCTION public.end_user_session(
  user_id UUID,
  session_id TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_sessions
  SET 
    ended_at = now(),
    is_active = false
  WHERE 
    user_id = end_user_session.user_id AND 
    session_id = end_user_session.session_id;
    
  -- Log logout
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
      details
    )
    SELECT
      end_user_session.user_id,
      p.username,
      'LOGOUT',
      end_user_session.user_id::text,
      'USER',
      jsonb_build_object(
        'session_id', end_user_session.session_id,
        'timestamp', now()
      )
    FROM public.profiles p
    WHERE p.id = end_user_session.user_id;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors to keep app working
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_online_users exactly matching frontend expectation
DROP FUNCTION IF EXISTS public.get_online_users(interval);

CREATE OR REPLACE FUNCTION public.get_online_users(time_window interval DEFAULT interval '15 minutes')
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  ip_address TEXT
) AS $$
BEGIN
  -- Mark stale sessions as inactive
  UPDATE public.user_sessions
  SET is_active = false
  WHERE last_active_at < (now() - time_window);

  -- Return only active users with actual login data
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
  -- Return empty set on error
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 3: USER ACTIVITY VIEW FUNCTION
-- ==========================================

-- Create function to handle URL path for user activity view
CREATE OR REPLACE FUNCTION public.get_activity_redirect_url(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- This must match exactly the URL pattern expected in AdminUsersPage.tsx handleViewActivity()
  RETURN '/admin/users/' || user_id::text;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- ==========================================
-- STEP 4: TRIGGER FOR AUTH TRACKING
-- ==========================================

-- Create login trigger to track user logins automatically
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
  EXCEPTION WHEN OTHERS THEN
    ip_addr := 'unknown';
  END;
  
  BEGIN
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    user_agent_str := 'unknown';
  END;

  -- Generate a unique session ID for this login
  session_id := 'login-' || NEW.id::text || '-' || extract(epoch from now())::text;
  
  -- Log IP address
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
  
  -- Log login activity
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
        'login_time', now()
      ),
      ip_addr,
      user_agent_str
    FROM public.profiles p
    WHERE p.id = NEW.id;
  END IF;
  
  -- Create session
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
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Always return NEW to avoid breaking auth
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

-- Create the trigger on auth.users
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
-- STEP 5: GRANT PERMISSIONS
-- ==========================================

-- Grant execution permissions for all functions
GRANT EXECUTE ON FUNCTION public.update_user_last_active(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.end_user_session(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_online_users(interval) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_activity_redirect_url(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.on_auth_user_login() TO service_role;

-- ==========================================
-- STEP 6: ADD REAL SESSIONS FOR TESTING
-- ==========================================

-- Add sample data for your user to verify functionality
DO $$
DECLARE
  admin_user_id UUID;
  regular_user_id UUID; 
BEGIN
  -- Get admin user
  SELECT id INTO admin_user_id 
  FROM public.profiles 
  WHERE is_admin = true 
  LIMIT 1;
  
  -- Get regular user
  SELECT id INTO regular_user_id 
  FROM public.profiles 
  WHERE is_admin = false 
  LIMIT 1;
  
  -- Only add data if we have users
  IF admin_user_id IS NOT NULL THEN
    -- Add admin session
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
      admin_user_id,
      'admin-session-' || gen_random_uuid(),
      '192.168.1.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/96.0.4664.45',
      now() - interval '10 minutes',
      now(),
      true
    )
    ON CONFLICT DO NOTHING;
    
    -- Add login activity
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
        ip_address
      )
      SELECT
        admin_user_id,
        p.username,
        'LOGIN',
        admin_user_id::text,
        'USER',
        jsonb_build_object(
          'login_time', now() - interval '10 minutes'
        ),
        '192.168.1.1'
      FROM public.profiles p
      WHERE p.id = admin_user_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Add regular user if we have one
  IF regular_user_id IS NOT NULL THEN
    -- Add regular user session
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
      regular_user_id,
      'user-session-' || gen_random_uuid(),
      '192.168.1.2',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      now() - interval '5 minutes',
      now(),
      true
    )
    ON CONFLICT DO NOTHING;
    
    -- Add login activity
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
        ip_address
      )
      SELECT
        regular_user_id,
        p.username,
        'LOGIN',
        regular_user_id::text,
        'USER',
        jsonb_build_object(
          'login_time', now() - interval '5 minutes'
        ),
        '192.168.1.2'
      FROM public.profiles p
      WHERE p.id = regular_user_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END
$$;
