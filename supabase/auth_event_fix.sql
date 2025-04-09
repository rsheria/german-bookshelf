-- COMPLETE AUTH EVENT FIX
-- This is specifically tailored to your application structure

-- First make sure we have the last_sign_in column
DO $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_sign_in'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    ALTER TABLE public.profiles ADD COLUMN last_sign_in timestamptz;
  END IF;
END $$;

-- Create a function that runs on auth.sessions insert
-- This is the key function that works with your actual app structure
CREATE OR REPLACE FUNCTION public.handle_user_login_event()
RETURNS trigger AS $$
DECLARE
  user_profile RECORD;
  user_name text;
  ip_addr text;
BEGIN
  -- Get the profile data
  SELECT * INTO user_profile 
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Use coalesce to handle nulls
  user_name := COALESCE(user_profile.username, 'User');
  ip_addr := COALESCE(NEW.ip, '0.0.0.0');
  
  -- Update last_sign_in
  UPDATE public.profiles
  SET last_sign_in = NOW()
  WHERE id = NEW.user_id;
  
  -- Save the session information
  INSERT INTO public.user_sessions (
    user_id,
    session_id,
    started_at,
    last_active_at,
    is_active,
    ip_address,
    user_agent
  ) VALUES (
    NEW.user_id,
    gen_random_uuid(), -- Generate a new session ID
    NOW(),
    NOW(),
    true,
    ip_addr,
    'Login from auth.sessions'
  )
  ON CONFLICT (user_id, session_id) 
  DO NOTHING;
  
  -- Log the login activity
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    created_at
  ) VALUES (
    NEW.user_id::text,
    'user',
    'LOGIN',
    ip_addr,
    user_name,
    NOW()
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ensure the trigger doesn't break authentication
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure we have the constraint for sessions
DO $$
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_sessions_user_id_session_id_key'
  ) THEN
    ALTER TABLE public.user_sessions 
    ADD CONSTRAINT user_sessions_user_id_session_id_key 
    UNIQUE (user_id, session_id);
  END IF;
EXCEPTION WHEN others THEN
  -- In case the constraint already exists
  NULL;
END $$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_user_login ON auth.sessions;

-- Create the new trigger on auth.sessions
CREATE TRIGGER on_user_login
AFTER INSERT ON auth.sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_login_event();

-- Create or replace the get_user_activities function
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

-- Fix the get_online_users function to show active users
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamp with time zone,
  ip_address text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.username,
    GREATEST(s.last_active_at, p.last_sign_in) AS last_active,
    s.ip_address
  FROM 
    public.profiles p
  LEFT JOIN public.user_sessions s ON p.id = s.user_id
  WHERE 
    p.last_sign_in IS NOT NULL 
    AND p.last_sign_in > NOW() - INTERVAL '24 hours'
  ORDER BY 
    p.id, 
    GREATEST(s.last_active_at, p.last_sign_in) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a tracking function for page views that actually works
CREATE OR REPLACE FUNCTION track_page_view(
  p_user_id uuid,
  p_url text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  username_val text;
BEGIN
  -- Get username
  SELECT username INTO username_val
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Log the page view
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    details,
    created_at
  ) VALUES (
    p_user_id::text,
    'user',
    'page_view',
    p_ip_address,
    username_val,
    json_build_object('url', p_url),
    NOW()
  );
  
  -- Update last active time in sessions
  UPDATE public.user_sessions
  SET last_active_at = NOW(),
      ip_address = COALESCE(p_ip_address, ip_address)
  WHERE user_id = p_user_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
