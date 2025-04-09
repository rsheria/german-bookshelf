-- COLUMN FIX
-- This fixes the column name issue in the profiles table

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.get_online_profiles(integer);

-- Get column information from profiles table
-- Let's first check what columns actually exist in the profiles table
DO $$
BEGIN
  RAISE NOTICE 'Checking profiles table structure:';
  FOR column_info IN 
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '% - %', column_info.column_name, column_info.data_type;
  END LOOP;
END $$;

-- Create a fixed version without the problematic column
CREATE OR REPLACE FUNCTION public.get_online_profiles(p_minutes_ago integer DEFAULT 15)
RETURNS TABLE (
  id uuid,
  username text,
  last_active timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.username,
    us.last_active_at as last_active
  FROM public.profiles p
  JOIN public.user_sessions us ON p.id = us.user_id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - (p_minutes_ago::text || ' minutes')::interval)
  GROUP BY p.id, p.username, us.last_active_at
  ORDER BY us.last_active_at DESC;
$$;

-- Get user details without the last_sign_in column
CREATE OR REPLACE FUNCTION public.get_user_details(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data json;
  activity_data json;
BEGIN
  -- Get basic user data
  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'email', p.email,
    'created_at', p.created_at
  ) INTO user_data
  FROM public.profiles p
  WHERE p.id = p_user_id;
  
  -- Get user activity summary
  SELECT json_build_object(
    'total_activities', COUNT(*),
    'last_activity', MAX(created_at),
    'actions', json_object_agg(action, count)
  ) INTO activity_data
  FROM (
    SELECT 
      action, 
      COUNT(*) as count,
      MAX(created_at) as created_at
    FROM public.activity_logs
    WHERE entity_id = p_user_id::text
    GROUP BY action
  ) activity_stats;
  
  -- Combine everything
  RETURN json_build_object(
    'user', user_data,
    'activity', activity_data,
    'sessions', (
      SELECT json_agg(json_build_object(
        'session_id', session_id,
        'started_at', started_at,
        'last_active_at', last_active_at,
        'is_active', is_active,
        'ip_address', ip_address
      ))
      FROM public.user_sessions
      WHERE user_id = p_user_id
      ORDER BY last_active_at DESC
      LIMIT 10
    )
  );
END;
$$;

-- Fix the online users function to ensure it works correctly
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
    us.last_active_at >= (now() - interval '15 minutes')
  ORDER BY us.user_id, us.last_active_at DESC;
$$;

-- Add row-level security policy to make profiles readable
ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read profiles
DROP POLICY IF EXISTS "profiles:read" ON public.profiles;
CREATE POLICY "profiles:read" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
  
-- Create policy to allow user to edit their own profile
DROP POLICY IF EXISTS "profiles:update:own" ON public.profiles;
CREATE POLICY "profiles:update:own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
