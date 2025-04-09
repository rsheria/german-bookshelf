-- SAFE LOGIN FIX
-- This script will fix the login issues by removing triggers that interfere with auth

-- First, clean up any problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.sessions;
DROP TRIGGER IF EXISTS on_user_login ON auth.sessions;
DROP TRIGGER IF EXISTS on_auth_login ON auth.sessions;

-- Drop problematic functions
DROP FUNCTION IF EXISTS public.handle_auth_user_login() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_login_event() CASCADE;

-- Create functions for MANUAL tracking that won't interfere with login
CREATE OR REPLACE FUNCTION public.get_user_activities(
  user_id_param uuid, 
  limit_param integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  action text,
  entity_type text,
  entity_name text,
  created_at timestamp with time zone,
  ip_address text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id::uuid,
    a.action,
    a.entity_type,
    a.entity_name,
    a.created_at,
    a.ip_address
  FROM
    public.activity_logs a
  WHERE
    a.entity_id = user_id_param::text
    AND a.entity_type = 'user'
  ORDER BY
    a.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log a login manually AFTER successful login
CREATE OR REPLACE FUNCTION public.log_login_activity(
  user_id_param uuid,
  ip_address_param text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  username_val text;
BEGIN
  -- Get username
  SELECT username INTO username_val
  FROM profiles
  WHERE id = user_id_param;
  
  -- Update last_sign_in in profiles
  UPDATE profiles
  SET last_sign_in = NOW()
  WHERE id = user_id_param;
  
  -- Create/update a session
  BEGIN
    INSERT INTO user_sessions (
      user_id,
      session_id,
      started_at,
      last_active_at,
      is_active,
      ip_address,
      user_agent
    ) VALUES (
      user_id_param,
      gen_random_uuid(),
      NOW(),
      NOW(),
      true,
      COALESCE(ip_address_param, '0.0.0.0'),
      'Frontend login'
    );
  EXCEPTION WHEN others THEN
    -- If insert fails, try to update
    UPDATE user_sessions
    SET last_active_at = NOW(),
        is_active = true
    WHERE user_id = user_id_param;
  END;
  
  -- Log activity
  INSERT INTO activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    created_at
  ) VALUES (
    user_id_param::text,
    'user',
    'LOGIN',
    COALESCE(ip_address_param, '0.0.0.0'),
    username_val,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make the get_online_users function less complex to avoid errors
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamp with time zone,
  ip_address text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    COALESCE(p.last_sign_in, NOW()) as last_active,
    COALESCE(s.ip_address, '0.0.0.0') as ip_address
  FROM 
    profiles p
  LEFT JOIN user_sessions s ON p.id = s.user_id
  WHERE 
    p.last_sign_in IS NOT NULL 
    AND p.last_sign_in > NOW() - INTERVAL '24 hours'
  ORDER BY 
    p.last_sign_in DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
