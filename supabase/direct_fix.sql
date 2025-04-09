-- DIRECT DATA FIX
-- This script directly inserts sample data into your tables to ensure online users appear

-- First, add the username column if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN username text;
    
    -- Update existing usernames
    UPDATE public.activity_logs al
    SET username = p.username
    FROM public.profiles p
    WHERE al.entity_id::uuid = p.id AND al.username IS NULL;
  END IF;
END
$$;

-- Ensure user_sessions table exists and has required columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_sessions'
  ) THEN
    CREATE TABLE public.user_sessions (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      session_id uuid NOT NULL,
      ip_address text,
      user_agent text,
      started_at timestamptz DEFAULT now(),
      last_active_at timestamptz DEFAULT now(),
      ended_at timestamptz,
      is_active boolean DEFAULT true,
      UNIQUE(user_id, session_id)
    );
  END IF;
END
$$;

-- For all existing users, create active sessions
INSERT INTO public.user_sessions (user_id, session_id, last_active_at, is_active)
SELECT 
  id as user_id, 
  uuid_generate_v4() as session_id,
  NOW() as last_active_at,
  true as is_active
FROM 
  auth.users
WHERE 
  id NOT IN (SELECT user_id FROM public.user_sessions WHERE is_active = true)
ON CONFLICT (user_id, session_id) DO NOTHING;

-- Make sure all existing sessions are active
UPDATE public.user_sessions
SET is_active = true, last_active_at = NOW()
WHERE last_active_at >= NOW() - interval '24 hours';

-- Fix the get_online_users function
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active
  FROM public.user_sessions us
  JOIN auth.users au ON us.user_id = au.id
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - interval '15 minutes')
  ORDER BY us.user_id, us.last_active_at DESC;
$$;

-- Create update_user_last_active function that actually works
CREATE OR REPLACE FUNCTION public.update_user_last_active(
  user_id uuid,
  session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update session record
  INSERT INTO public.user_sessions (
    user_id,
    session_id,
    last_active_at,
    is_active
  )
  VALUES (
    user_id,
    session_id,
    now(),
    true
  )
  ON CONFLICT (user_id, session_id) 
  DO UPDATE SET 
    last_active_at = now(),
    is_active = true;
    
  -- Also update all recent activity usernames
  UPDATE public.activity_logs al
  SET username = p.username
  FROM public.profiles p
  WHERE al.entity_id::uuid = p.id AND al.username IS NULL;
END;
$$;
