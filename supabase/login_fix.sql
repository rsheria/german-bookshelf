-- LOGIN FIX WITHOUT AUTH TRIGGERS
-- This avoids using triggers on auth tables which can cause permission issues

-- Drop the problematic auth trigger that's causing login failures
DROP TRIGGER IF EXISTS auth_sign_in_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_sign_in();

-- 1. Create a simpler function to log logins that the frontend code will call directly
CREATE OR REPLACE FUNCTION public.log_user_login(
  p_user_id uuid,
  p_username text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the login in activity_logs
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
    'LOGIN',
    jsonb_build_object('method', 'email'),
    p_ip_address,
    p_username,
    NOW()
  );
  
  -- Create active session
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
    uuid_generate_v4(), -- Generate new session ID
    NOW(),
    NOW(),
    true,
    p_ip_address,
    p_user_agent
  );
  
  -- Update profile last_active
  BEGIN
    -- Check if last_active column exists in profiles
    UPDATE public.profiles
    SET last_active = NOW()
    WHERE id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Column might not exist, ignore error
    NULL;
  END;
END;
$$;

-- 2. Fix get_online_users to use a simpler approach
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
  -- Get recently active users from sessions table
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active,
    us.ip_address
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - interval '15 minutes')
  ORDER BY us.user_id, us.last_active_at DESC;
$$;

-- 3. Add sample data for testing (real login events will happen when users log in)
INSERT INTO public.activity_logs (
  entity_id,
  entity_type,
  action,
  details,
  ip_address,
  username,
  created_at
)
SELECT 
  id::text,
  'user',
  'LOGIN',
  '{}'::jsonb,
  '192.168.1.' || (ROW_NUMBER() OVER (ORDER BY id))::text,
  username,
  NOW() - (RANDOM() * INTERVAL '30 minutes')
FROM 
  public.profiles
WHERE 
  NOT EXISTS (
    SELECT 1 FROM public.activity_logs 
    WHERE entity_id = profiles.id::text AND action = 'LOGIN'
  )
LIMIT 5;

-- 4. Create active sessions for these users
INSERT INTO public.user_sessions (
  user_id,
  session_id,
  started_at,
  last_active_at,
  is_active,
  ip_address,
  user_agent
)
SELECT 
  id,
  uuid_generate_v4(),
  NOW() - (RANDOM() * INTERVAL '30 minutes'),
  NOW() - (RANDOM() * INTERVAL '5 minutes'),
  true,
  '192.168.1.' || (ROW_NUMBER() OVER (ORDER BY id))::text,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM 
  public.profiles
WHERE 
  NOT EXISTS (
    SELECT 1 FROM public.user_sessions 
    WHERE user_id = profiles.id AND is_active = true
  )
LIMIT 5;
