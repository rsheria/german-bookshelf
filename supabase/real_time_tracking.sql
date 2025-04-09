-- REAL-TIME TRACKING FIX
-- This sets up the proper triggers and functions for real-time tracking

-- First, clear any fake data we may have inserted
DELETE FROM public.user_sessions WHERE ip_address = '127.0.0.1' AND user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
DELETE FROM public.activity_logs WHERE action = 'LOGIN' AND ip_address = '127.0.0.1';

-- 1. Login trigger function
CREATE OR REPLACE FUNCTION public.on_auth_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Log login activity
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    username,
    created_at
  ) VALUES (
    NEW.id::text,
    'user',
    'LOGIN',
    jsonb_build_object('method', COALESCE(NEW.raw_app_meta_data->>'provider', 'email')),
    (SELECT username FROM public.profiles WHERE id = NEW.id),
    NOW()
  );
  
  -- Create/update session
  INSERT INTO public.user_sessions (
    user_id,
    session_id,
    started_at,
    last_active_at,
    is_active
  ) VALUES (
    NEW.id,
    NEW.session_id,
    NOW(),
    NOW(),
    true
  )
  ON CONFLICT (user_id, session_id) 
  DO UPDATE SET 
    last_active_at = NOW(),
    is_active = true;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users table if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.on_auth_user_login();

-- 2. Auth sign-up trigger function
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Log signup activity
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    username,
    created_at
  ) VALUES (
    NEW.id::text,
    'user',
    'SIGNUP',
    jsonb_build_object('method', COALESCE(NEW.raw_app_meta_data->>'provider', 'email')),
    COALESCE(NEW.email, NEW.phone, NEW.raw_user_meta_data->>'username', NEW.id::text),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users table if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_auth_user_created();

-- 3. Fix update_user_last_active_with_ip to properly store sessions
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
  
  -- Update user session
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
    
  -- Log the activity periodically (but not too frequently)
  IF NOT EXISTS (
    SELECT 1 FROM public.activity_logs 
    WHERE 
      entity_id = p_user_id::text 
      AND action = 'active' 
      AND created_at > (NOW() - interval '5 minutes')
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

-- 4. Fix get_online_users to use the last 5 minutes for truly active users
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamptz,
  ip_address text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active,
    us.ip_address
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - interval '5 minutes')
  ORDER BY us.user_id, us.last_active_at DESC;
$$;
