-- FIX USER SESSIONS TABLE AND TRACKING
-- This script specifically addresses the user session tracking issue without changing security

-- First, make sure we have necessary helper functions
CREATE OR REPLACE FUNCTION ensure_user_session(
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id UUID;
  session_exists BOOLEAN;
BEGIN
  -- Check if a session exists
  SELECT EXISTS (
    SELECT 1 FROM public.user_sessions 
    WHERE user_id = p_user_id
  ) INTO session_exists;
  
  IF session_exists THEN
    -- Update existing session
    UPDATE public.user_sessions
    SET 
      last_active_at = NOW(),
      is_active = true,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO session_id;
  ELSE
    -- Create a new session
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      is_active,
      started_at,
      last_active_at,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      gen_random_uuid(),
      true,
      NOW(),
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO session_id;
  END IF;
  
  -- Also update profile last_active
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = p_user_id;
  
  RETURN session_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL on error
    RETURN NULL;
END;
$$;

-- Create helper view for user session status
-- This fixes the "multiple rows returned" error
CREATE OR REPLACE VIEW public.user_session_status AS
SELECT DISTINCT ON (user_id)
  user_id,
  is_active,
  last_active_at,
  started_at
FROM
  public.user_sessions
ORDER BY
  user_id, last_active_at DESC;

-- Grant access to the view
GRANT SELECT ON public.user_session_status TO authenticated;

-- Add function to get a single user's session status
CREATE OR REPLACE FUNCTION get_user_session_status(user_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  is_active BOOLEAN,
  last_active_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First ensure the user has a session
  PERFORM ensure_user_session(user_id_param);
  
  -- Return the latest session data
  RETURN QUERY
  SELECT s.user_id, s.is_active, s.last_active_at, s.started_at
  FROM public.user_session_status s
  WHERE s.user_id = user_id_param;
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_user_session_status TO authenticated;
