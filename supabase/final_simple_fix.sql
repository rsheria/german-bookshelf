-- SIMPLE FIX WITHOUT DIAGNOSTIC
-- This removes the problematic diagnostic code and fixes the functions

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.get_online_profiles(integer);

-- Create a fixed version without the problematic column
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

-- Fix the row level security policies
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
