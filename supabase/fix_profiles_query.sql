-- FIX PROFILES QUERY
-- This script focuses on fixing the profiles query with last_sign_in parameter

-- First, check profiles table structure
DO $$
DECLARE
  column_exists boolean;
BEGIN
  -- Check if last_sign_in column exists in profiles
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_sign_in'
  ) INTO column_exists;
  
  -- If column doesn't exist, add it
  IF NOT column_exists THEN
    ALTER TABLE public.profiles ADD COLUMN last_sign_in timestamptz;
    
    -- Populate with data from user_sessions for existing users
    UPDATE public.profiles p
    SET last_sign_in = (
      SELECT MAX(last_active_at)
      FROM public.user_sessions us
      WHERE us.user_id = p.id
    );
  END IF;
END $$;

-- Create a function to get online users that doesn't rely on the problematic query
CREATE OR REPLACE FUNCTION public.get_online_users_for_admin()
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  last_active timestamptz,
  ip_address text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.username,
    p.email,
    us.last_active_at as last_active,
    us.ip_address
  FROM public.profiles p
  JOIN public.user_sessions us ON p.id = us.user_id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - interval '15 minutes')
  GROUP BY p.id, p.username, p.email, us.last_active_at, us.ip_address
  ORDER BY us.last_active_at DESC;
$$;

-- Create a safer view for admin to query profiles
CREATE OR REPLACE VIEW admin_profiles AS
SELECT 
  p.id,
  p.username,
  p.email,
  COALESCE(p.last_sign_in, us.last_active_at) as last_active,
  p.created_at,
  us.ip_address,
  us.user_agent
FROM 
  public.profiles p
LEFT JOIN (
  SELECT DISTINCT ON (user_id) 
    user_id, 
    last_active_at, 
    ip_address, 
    user_agent
  FROM public.user_sessions
  WHERE is_active = true
  ORDER BY user_id, last_active_at DESC
) us ON p.id = us.user_id
ORDER BY COALESCE(p.last_sign_in, us.last_active_at) DESC NULLS LAST;

-- Grant access to the view
GRANT SELECT ON admin_profiles TO authenticated;

-- Create a special function to update last_sign_in that's triggered by login
CREATE OR REPLACE FUNCTION public.track_user_login(
  p_user_id uuid,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
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
  
  -- Update last_sign_in
  UPDATE public.profiles
  SET last_sign_in = NOW()
  WHERE id = p_user_id;
  
  -- Add login activity
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
    '{}'::jsonb,
    p_ip_address,
    v_username,
    NOW()
  );
END;
$$;

-- Ensure view is accessible
ALTER VIEW admin_profiles OWNER TO postgres;
GRANT SELECT ON admin_profiles TO anon;
GRANT SELECT ON admin_profiles TO authenticated;
GRANT SELECT ON admin_profiles TO service_role;
