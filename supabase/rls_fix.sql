-- SECURE RLS FIX FOR USER TRACKING
-- Addresses both last_active tracking and IP logging

BEGIN;

-- ===============================================
-- Fix RLS policies for profiles
-- ===============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop policies that might conflict
DROP POLICY IF EXISTS "Allow system to update last_active" ON public.profiles;
DROP POLICY IF EXISTS "System can update last_active" ON public.profiles;
DROP POLICY IF EXISTS "Admin has full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can access their own profile" ON public.profiles;

-- Create secure policies for profiles
-- Admin can do everything
CREATE POLICY "Admin has full access" ON public.profiles 
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can see their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ===============================================
-- Fix RLS policies for ip_logs
-- ===============================================

ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

-- Drop policies that might conflict
DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin has full access to IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow users to insert IP logs" ON public.ip_logs;

-- Create secure policies for ip_logs
-- Allow users to insert their own IP logs
CREATE POLICY "Users can insert own IP logs" ON public.ip_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admins to select all IP logs
CREATE POLICY "Admin has full access to IP logs" ON public.ip_logs
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow users to view their own IP logs
CREATE POLICY "Users can view own IP logs" ON public.ip_logs
FOR SELECT
USING (auth.uid() = user_id);

COMMIT;
