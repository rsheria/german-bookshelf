-- Enhanced Admin Authentication Security
-- This SQL file adds secure server-side admin validation for German Bookshelf

-- Create a secure RPC function to validate admin status server-side
-- This prevents client-side spoofing of admin credentials
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  admin_status BOOLEAN;
BEGIN
  -- Get the authenticated user ID
  current_user_id := auth.uid();
  
  -- If no user is authenticated, return false
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check the admin status in the profiles table
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = current_user_id;
  
  -- Return the admin status (or false if not found)
  RETURN COALESCE(admin_status, false);
END;
$$;

-- Create another helper function that is more efficient for RLS policies
CREATE OR REPLACE FUNCTION is_admin_secure()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  -- Check the admin status in the profiles table for current user
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Return the admin status (or false if not found)
  RETURN COALESCE(admin_status, false);
END;
$$;

-- Add JWT validation helper to verify tokens server-side
-- This can be used to validate tokens in custom endpoints
CREATE OR REPLACE FUNCTION validate_jwt(token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  payload JSONB;
BEGIN
  -- Validate the JWT and extract payload
  -- This uses Supabase's built-in JWT verification
  payload := auth.jwt_verify(token, auth.jwt_key());
  
  -- If verification fails, it will throw an error
  -- Otherwise, return the decoded payload
  RETURN payload;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Add function to revoke specific sessions by refresh token
-- This provides an additional security layer for admins to terminate suspicious sessions
CREATE OR REPLACE FUNCTION admin_revoke_session(user_id UUID, token_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  is_requester_admin BOOLEAN;
BEGIN
  -- Check if the requesting user is an admin
  SELECT is_admin INTO is_requester_admin 
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Only admins can revoke sessions
  IF NOT COALESCE(is_requester_admin, false) THEN
    RAISE EXCEPTION 'Only administrators can revoke sessions';
  END IF;
  
  -- Revoke the session
  DELETE FROM public.active_sessions
  WHERE user_id = admin_revoke_session.user_id
  AND refresh_token_hash = admin_revoke_session.token_hash;
  
  RETURN FOUND;
END;
$$;

-- Add enhanced security logging
CREATE OR REPLACE FUNCTION log_security_event(
  event_type TEXT,
  details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the authenticated user ID
  current_user_id := auth.uid();
  
  -- Insert security event log
  INSERT INTO public.activity_logs (
    user_id,
    action,
    details,
    ip_address
  ) VALUES (
    current_user_id,
    'security_' || event_type,
    details,
    '0.0.0.0'::inet -- IP should be passed from application for accuracy
  );
END;
$$;

-- Add function to check if a JWT token is still valid
CREATE OR REPLACE FUNCTION is_token_valid(token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  payload JSONB;
  exp_time BIGINT;
  current_unix_time BIGINT; -- Renamed to avoid conflict with reserved keyword
BEGIN
  -- Verify the token
  payload := validate_jwt(token);
  
  -- If verification failed, return false
  IF payload IS NULL THEN
    RETURN false;
  END IF;
  
  -- Extract expiration time
  exp_time := (payload->>'exp')::BIGINT;
  
  -- Get current Unix timestamp
  -- Using current_unix_time to avoid conflict with reserved PostgreSQL keyword
  current_unix_time := EXTRACT(EPOCH FROM NOW())::BIGINT;
  
  -- Check if token is expired
  RETURN current_unix_time < exp_time;
END;
$$;
