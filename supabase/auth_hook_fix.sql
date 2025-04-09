-- AUTH HOOK FIX
-- This connects the actual Supabase Auth events to your user tracking system

-- First clean up any fake data
DELETE FROM public.user_sessions WHERE ip_address = '127.0.0.1' AND user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
DELETE FROM public.activity_logs WHERE action = 'LOGIN' AND ip_address = '127.0.0.1';

-- ================== CREATING AUTH TRIGGERS ==================
-- These triggers will automatically track user logins from the auth.users table

-- 1. Create function to capture auth sign-ins
CREATE OR REPLACE FUNCTION public.handle_auth_sign_in()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if this is actually a sign-in (last_sign_in_at changed)
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    -- Log the login activity in activity_logs
    INSERT INTO public.activity_logs (
      entity_id,
      entity_type,
      action,
      details,
      username,
      created_at
    ) 
    SELECT
      NEW.id::text,
      'user',
      'LOGIN',
      jsonb_build_object('provider', COALESCE(NEW.app_metadata->>'provider', 'email')),
      profiles.username,
      NEW.last_sign_in_at
    FROM
      public.profiles
    WHERE
      profiles.id = NEW.id;
    
    -- Also update or create a user session
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      started_at,
      last_active_at,
      is_active
    )
    VALUES (
      NEW.id,
      md5(NEW.id::text || NEW.last_sign_in_at::text)::uuid, -- Generate session ID from user ID and timestamp
      NEW.last_sign_in_at,
      NEW.last_sign_in_at,
      true
    )
    ON CONFLICT (user_id, session_id)
    DO UPDATE SET
      last_active_at = NEW.last_sign_in_at,
      is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the auth trigger if it doesn't exist
DROP TRIGGER IF EXISTS auth_sign_in_trigger ON auth.users;
CREATE TRIGGER auth_sign_in_trigger
  AFTER UPDATE OF last_sign_in_at
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_sign_in();

-- 2. Update user_last_active to maintain sessions
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
  username_val text;
BEGIN
  -- Get the username
  SELECT username INTO username_val
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Update the session data with IP
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
    COALESCE(
      (SELECT started_at FROM public.user_sessions WHERE user_id = p_user_id AND session_id = p_session_id),
      NOW()
    ),
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
    
  -- Also update the profile's last_active timestamp
  -- This is important for tracking online users correctly
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = p_user_id;
  
  -- Log a heartbeat activity (but no more than once every 5 minutes to avoid spam)
  IF NOT EXISTS (
    SELECT 1 FROM public.activity_logs
    WHERE 
      entity_id = p_user_id::text AND 
      action = 'HEARTBEAT' AND
      created_at > (NOW() - interval '5 minutes')
  ) THEN
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
      'HEARTBEAT',
      jsonb_build_object('user_agent', p_user_agent),
      p_ip_address,
      username_val,
      NOW()
    );
  END IF;
END;
$$;

-- 3. Add fallback for sessions without IP
CREATE OR REPLACE FUNCTION public.update_user_last_active(
  p_user_id uuid,
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update session
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
    COALESCE(
      (SELECT started_at FROM public.user_sessions WHERE user_id = p_user_id AND session_id = p_session_id),
      NOW()
    ),
    NOW(),
    true
  )
  ON CONFLICT (user_id, session_id)
  DO UPDATE SET
    last_active_at = NOW(),
    is_active = true;
    
  -- Also update the profile's last_active timestamp
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = p_user_id;
END;
$$;

-- 4. Create a proper get_online_users function that uses both methods
DROP FUNCTION IF EXISTS public.get_online_users();
CREATE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamptz,
  ip_address text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Get users with recent sessions (more accurate)
  SELECT 
    DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active,
    us.ip_address
  FROM 
    public.user_sessions us
  JOIN 
    public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - interval '5 minutes')
  
  UNION
  
  -- Also include users who have recent auth activity
  SELECT 
    p.id as user_id,
    p.username,
    u.last_sign_in_at as last_active,
    NULL as ip_address
  FROM 
    auth.users u
  JOIN 
    public.profiles p ON u.id = p.id
  WHERE 
    u.last_sign_in_at >= (now() - interval '5 minutes')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_sessions 
      WHERE user_id = u.id AND last_active_at >= (now() - interval '5 minutes')
    )
  
  ORDER BY last_active DESC;
$$;

-- 5. Ensure schema has needed columns
-- Check if last_active column exists in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_active timestamptz;
    
    -- Update all profiles with their latest activity time
    UPDATE public.profiles p
    SET last_active = (
      SELECT MAX(last_active_at)
      FROM public.user_sessions
      WHERE user_id = p.id
    );
  END IF;
END $$;
