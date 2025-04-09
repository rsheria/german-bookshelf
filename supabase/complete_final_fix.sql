-- COMPLETE FINAL FIX FOR USER TRACKING
-- Run this ENTIRE script in the Supabase SQL Editor

-- 1. Fix the profiles table to ensure it has last_sign_in
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
  END IF;
END $$;

-- 2. Create a better login trigger function that actually works
CREATE OR REPLACE FUNCTION public.handle_auth_user_login()
RETURNS trigger AS $$
DECLARE
  user_id uuid;
  user_email text;
  user_name text;
  ip_addr text := coalesce(NEW.ip_address, '0.0.0.0');
  user_agent_str text := coalesce(NEW.user_agent, 'Unknown');
BEGIN
  -- Get user information
  user_id := NEW.user_id::uuid;
  
  -- Get username from profiles
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = user_id;
  
  -- Update last_sign_in in profiles
  UPDATE public.profiles
  SET last_sign_in = NOW()
  WHERE id = user_id;
  
  -- Insert/update user session
  INSERT INTO public.user_sessions (
    user_id,
    session_id,
    started_at,
    last_active_at,
    is_active,
    ip_address,
    user_agent
  ) VALUES (
    user_id,
    NEW.session_id,
    NOW(),
    NOW(),
    true,
    ip_addr,
    user_agent_str
  )
  ON CONFLICT (user_id, session_id) 
  DO UPDATE SET
    last_active_at = NOW(),
    is_active = true,
    ip_address = ip_addr,
    user_agent = user_agent_str;
    
  -- Log the login activity
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    created_at
  ) VALUES (
    user_id::text,
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

-- Create new login trigger (will run when a user logs in)
CREATE TRIGGER on_auth_user_login
AFTER INSERT ON auth.sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_login();

-- Fix the user sessions table
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
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

-- 3. Create the exact function that the frontend is trying to call
DROP FUNCTION IF EXISTS public.get_user_activities(uuid, integer);

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

-- 4. Fix the get_online_users function to make it reliable
DROP FUNCTION IF EXISTS public.get_online_users();

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
    s.last_active_at,
    s.ip_address
  FROM 
    public.profiles p
  JOIN (
    -- Get the most recent session for each user
    SELECT DISTINCT ON (user_id) 
      user_id, 
      last_active_at, 
      ip_address
    FROM 
      public.user_sessions
    WHERE 
      is_active = true 
      AND last_active_at > NOW() - INTERVAL '15 minutes'
    ORDER BY 
      user_id, 
      last_active_at DESC
  ) s ON p.id = s.user_id
  ORDER BY 
    s.last_active_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add a function to manually log login activity (for testing)
CREATE OR REPLACE FUNCTION public.log_manual_login(user_id_input uuid)
RETURNS void AS $$
DECLARE
  username_val text;
  random_ip text;
BEGIN
  -- Get username
  SELECT username INTO username_val
  FROM public.profiles
  WHERE id = user_id_input;
  
  -- Generate random IP
  random_ip := '192.168.1.' || (FLOOR(RANDOM() * 255))::text;
  
  -- Update last_sign_in in profiles
  UPDATE public.profiles
  SET last_sign_in = NOW()
  WHERE id = user_id_input;
  
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
    user_id_input,
    uuid_generate_v4(),
    NOW(),
    NOW(),
    true,
    random_ip,
    'Manual Login Test'
  )
  ON CONFLICT (user_id, session_id) 
  DO NOTHING;
  
  -- Log activity
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    created_at
  ) VALUES (
    user_id_input::text,
    'user',
    'LOGIN',
    random_ip,
    username_val,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
