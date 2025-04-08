-- FIX FUNCTION PARAMETERS
-- This script fixes mismatches between frontend code and database functions

-- ==========================================
-- STEP 1: FIX is_user_banned PARAMETER NAMES
-- ==========================================

-- Drop existing function first
DROP FUNCTION IF EXISTS public.is_user_banned(uuid, text);

-- Recreate with EXACT parameter names expected by frontend
CREATE OR REPLACE FUNCTION public.is_user_banned(check_user_id UUID DEFAULT NULL, check_ip TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  is_banned BOOLEAN;
BEGIN
  -- Handle case when both params are NULL
  IF check_user_id IS NULL AND check_ip IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is banned by user_id or IP
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE 
      ((check_user_id IS NOT NULL AND user_bans.user_id = check_user_id) OR 
       (check_ip IS NOT NULL AND user_bans.ip_address = check_ip))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO is_banned;
  
  RETURN is_banned;

EXCEPTION WHEN OTHERS THEN
  -- On any error, allow login (return false)
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 2: FIX get_online_users FUNCTION
-- ==========================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_online_users();

-- Recreate it matching the expected signature
CREATE OR REPLACE FUNCTION public.get_online_users(time_window interval DEFAULT interval '15 minutes')
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  ip_address TEXT
) AS $$
BEGIN
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
    us.last_active_at > (now() - time_window)
  ORDER BY us.user_id, us.last_active_at DESC;
EXCEPTION WHEN OTHERS THEN
  -- Return empty set on error rather than failing
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 3: ADD SESSION TRACKING FUNCTIONS
-- ==========================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.track_user_session(uuid, text, text, text);

-- Create function to track user sessions as expected by frontend
CREATE OR REPLACE FUNCTION public.track_user_session(
  p_user_id UUID, 
  p_session_id TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
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

  -- Update existing session or create new one
  UPDATE public.user_sessions
  SET 
    last_active_at = now(),
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE user_id = p_user_id AND session_id = p_session_id;
  
  -- If no matching session, create a new one
  IF NOT FOUND THEN
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      ip_address,
      user_agent
    )
    VALUES (
      p_user_id,
      p_session_id,
      p_ip_address,
      p_user_agent
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Silently ignore errors to prevent blocking the app
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 4: ADD ADMIN HELPER FUNCTIONS
-- ==========================================

-- Function to get user IPs
CREATE OR REPLACE FUNCTION public.get_user_ips(p_user_id UUID)
RETURNS TABLE (
  ip_address TEXT,
  first_seen TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ip.ip_address,
    MIN(ip.created_at) as first_seen,
    MAX(ip.created_at) as last_seen,
    COUNT(*) as count
  FROM public.ip_logs ip
  WHERE ip.user_id = p_user_id
  GROUP BY ip.ip_address
  ORDER BY last_seen DESC;
EXCEPTION WHEN OTHERS THEN
  -- Return empty set rather than failing
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user activity
CREATE OR REPLACE FUNCTION public.get_user_activity(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  action TEXT,
  entity_id TEXT,
  entity_type TEXT,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT
) AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    RETURN QUERY
    SELECT 
      a.id,
      a.user_id,
      a.username,
      a.action,
      a.entity_id,
      a.entity_type,
      a.entity_name,
      a.details,
      a.created_at,
      a.ip_address
    FROM public.activity_logs a
    WHERE a.user_id = p_user_id
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Return empty set rather than failing
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 5: GRANT PERMISSIONS
-- ==========================================

-- Grant permissions to all functions
GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_online_users(interval) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_user_session(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_ips(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_activity(UUID, INTEGER, INTEGER) TO authenticated, service_role;

-- ==========================================
-- STEP 6: ADD SAMPLE DATA FOR TESTING
-- ==========================================

-- Insert a sample user session to demonstrate online users
DO $$
DECLARE
  sample_user_id UUID;
  current_timestamp TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Try to get an admin user ID
  SELECT id INTO sample_user_id FROM public.profiles WHERE is_admin = true LIMIT 1;
  
  -- If no admin found, try to get any user
  IF sample_user_id IS NULL THEN
    SELECT id INTO sample_user_id FROM public.profiles LIMIT 1;
  END IF;
  
  -- Only proceed if we found a user
  IF sample_user_id IS NOT NULL THEN
    -- Add sample user session
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
      sample_user_id,
      'sample-session-' || gen_random_uuid(),
      '127.0.0.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      current_timestamp,
      current_timestamp,
      true
    )
    ON CONFLICT DO NOTHING;
    
    -- Add sample IP log
    INSERT INTO public.ip_logs (
      user_id,
      ip_address,
      user_agent,
      created_at
    )
    VALUES (
      sample_user_id,
      '127.0.0.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      current_timestamp
    )
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;
