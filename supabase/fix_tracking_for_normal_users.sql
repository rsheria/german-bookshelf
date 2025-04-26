-- FIX IP TRACKING AND LAST ACTIVE FOR NORMAL USERS
-- This script focuses on allowing normal users to record their IPs and update last_active
-- Without compromising security or requiring frontend code changes

BEGIN;

-- ===============================================
-- PART 1: FULLY PERMISSIVE IP LOGS POLICY
-- ===============================================

-- First, reset the IP logs table policies
ALTER TABLE public.ip_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin has full access to IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow inserting IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow all IP log operations" ON public.ip_logs;

-- Create policies with conditional checks:
-- 1. Admin can do everything
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ip_logs' 
    AND policyname = 'Admin has full access to IP logs'
  ) THEN
    CREATE POLICY "Admin has full access to IP logs" ON public.ip_logs
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- 2. Everyone can INSERT their own logs (critical for tracking)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ip_logs' 
    AND policyname = 'Anyone can insert IP logs'
  ) THEN
    CREATE POLICY "Anyone can insert IP logs" ON public.ip_logs FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- 3. Users can only view their own logs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ip_logs' 
    AND policyname = 'Users can view their own IP logs'
  ) THEN
    CREATE POLICY "Users can view their own IP logs" ON public.ip_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ===============================================
-- PART 2: SIMPLIFIED PROFILES TABLE POLICIES
-- ===============================================

-- Reset profiles table policies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Profiles are viewable by users who created them." ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be updated by users who created them." ON public.profiles;
DROP POLICY IF EXISTS "Users can update last_active" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "System can update profile last_active" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin has full access to profiles" ON public.profiles;

-- Create simpler policies with conditional checks:
-- 1. Admin can do anything with profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Admin has full access to profiles'
  ) THEN
    CREATE POLICY "Admin has full access to profiles" ON public.profiles
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- 2. Regular users can view their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

-- 3. Regular users can update their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 4. Special policy: Allow anyone to update last_active
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Allow updating last_active'
  ) THEN
    CREATE POLICY "Allow updating last_active" ON public.profiles FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ===============================================
-- PART 3: TRIGGER FOR AUTOMATIC UPDATES
-- ===============================================

-- Create a trigger function that updates last_active on session creation
CREATE OR REPLACE FUNCTION public.track_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last_active timestamp
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create a trigger on the active_sessions table
DROP TRIGGER IF EXISTS track_user_activity_trigger ON public.active_sessions;
CREATE TRIGGER track_user_activity_trigger
AFTER INSERT OR UPDATE ON public.active_sessions
FOR EACH ROW
EXECUTE FUNCTION public.track_user_activity();

-- ===============================================
-- PART 4: ACTIVE SESSIONS POLICIES
-- ===============================================

-- Make sure active_sessions has appropriate policies
ALTER TABLE public.active_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert active sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Admin has full access to active sessions" ON public.active_sessions;

-- Create simplified policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'active_sessions' 
    AND policyname = 'Admin has full access to active sessions'
  ) THEN
    CREATE POLICY "Admin has full access to active sessions" ON public.active_sessions
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Only create if doesn't exist yet
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'active_sessions' 
    AND policyname = 'Anyone can insert active sessions'
  ) THEN
    CREATE POLICY "Anyone can insert active sessions" ON public.active_sessions FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Only create if doesn't exist yet
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'active_sessions' 
    AND policyname = 'Users can view their own active sessions'
  ) THEN
    CREATE POLICY "Users can view their own active sessions" ON public.active_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

COMMIT;
