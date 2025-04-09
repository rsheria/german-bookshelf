-- DROP FIRST AND THEN CREATE
-- This fixes the return type error

-- First drop the function with the current signature
DROP FUNCTION IF EXISTS public.get_online_users();

-- Now create the function with the new signature
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

-- Now add the login trigger function
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
