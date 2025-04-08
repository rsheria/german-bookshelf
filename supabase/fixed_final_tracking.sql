-- FINAL TRACKING FIX - WITH CASCADE FOR SAFE FUNCTION DROPS
-- First, safely drop functions with CASCADE if they exist

-- Drop the auth functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.on_auth_user_login() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;

-- Create proper user tracking functions
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_auth_user_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
BEGIN
  -- Generate a session ID
  session_id := uuid_generate_v4();
  
  -- Create or update user session
  INSERT INTO public.user_sessions (
    user_id, 
    session_id, 
    ip_address, 
    user_agent, 
    created_at, 
    last_active_at, 
    is_active
  )
  VALUES (
    NEW.id, 
    session_id, 
    COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0'), 
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'Unknown'), 
    NOW(), 
    NOW(), 
    true
  )
  ON CONFLICT (user_id, session_id) 
  DO UPDATE SET
    last_active_at = NOW(),
    is_active = true;
  
  -- Log a successful login
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    created_at,
    session_id,
    ip_address,
    user_agent
  )
  VALUES (
    NEW.id,
    'user',
    'login',
    NOW(),
    session_id::text,
    COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0'),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'Unknown')
  );
  
  RETURN NEW;
END;
$$;

-- Create RPC functions for tracking
CREATE OR REPLACE FUNCTION public.update_user_last_active(
  p_user_id uuid,
  p_session_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's last active timestamp
  UPDATE public.user_sessions 
  SET last_active_at = NOW() 
  WHERE 
    user_id = p_user_id AND 
    session_id::text = p_session_id AND
    is_active = true;
  
  -- If no sessions were updated, create a new one
  IF NOT FOUND THEN
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      ip_address,
      user_agent,
      created_at,
      last_active_at,
      is_active
    )
    VALUES (
      p_user_id,
      p_session_id::uuid,
      COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0'),
      COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'Unknown'),
      NOW(),
      NOW(),
      true
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_page_view(
  p_user_id uuid,
  p_page_path text,
  p_session_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First ensure the session is active
  PERFORM public.update_user_last_active(p_user_id, p_session_id);
  
  -- Then log the page view
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    created_at,
    session_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    NOW(),
    p_session_id,
    COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0'),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'Unknown')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.end_user_session(
  p_user_id uuid,
  p_session_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark the session as inactive
  UPDATE public.user_sessions
  SET 
    is_active = false,
    last_active_at = NOW()
  WHERE 
    user_id = p_user_id AND 
    session_id::text = p_session_id;
  
  -- Log the logout
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    created_at,
    session_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    'user',
    'logout',
    NOW(),
    p_session_id,
    COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0'),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'Unknown')
  );
END;
$$;

-- Enhanced function to get online users with a time window
CREATE OR REPLACE FUNCTION public.get_online_users(time_window interval DEFAULT interval '15 minutes')
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
    us.last_active_at >= (now() - time_window)
  ORDER BY us.user_id, us.last_active_at DESC;
$$;

-- Re-create the necessary triggers after dropping
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.on_auth_user_created();
  
CREATE OR REPLACE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE PROCEDURE public.on_auth_user_login();

-- Fix the is_user_banned function
CREATE OR REPLACE FUNCTION public.is_user_banned(check_user_id uuid DEFAULT NULL, check_ip text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_banned boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE 
      (user_id = check_user_id OR ip_address = check_ip)
      AND is_active = true
  ) INTO is_banned;
  
  RETURN is_banned;
END;
$$;

-- Create the proper activity log table if it doesn't exist (with proper types)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_id text NOT NULL,
  entity_type text NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  session_id text DEFAULT NULL,
  ip_address text DEFAULT NULL,
  user_agent text DEFAULT NULL
);

-- Create necessary indexes for performance
CREATE INDEX IF NOT EXISTS activity_logs_entity_id_idx ON public.activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_last_active_at_idx ON public.user_sessions(last_active_at);
CREATE INDEX IF NOT EXISTS user_sessions_is_active_idx ON public.user_sessions(is_active);

-- Set proper permissions
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow admins full access to activity logs"
  ON public.activity_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admins full access to user sessions"
  ON public.user_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow users access to their own activity"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (entity_id::uuid = auth.uid());

CREATE POLICY "Allow users access to their own sessions"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
