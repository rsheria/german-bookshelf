-- DIRECT FIX FOR IP LOGS RLS ERROR
-- This script directly targets the error: 'new row violates row-level security policy for table "ip_logs"'

BEGIN;

-- ========================================================
-- COMPLETELY RESET IP LOGS TABLE RLS POLICIES
-- ========================================================

-- First, disable RLS and then re-enable it to clear any issues
ALTER TABLE public.ip_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on the ip_logs table to start fresh
DROP POLICY IF EXISTS "Users can view their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin has full access to IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Anyone can insert IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow inserting IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow all IP log operations" ON public.ip_logs;

-- Create ONE SIMPLE policy that allows both INSERT and SELECT for the user's own data
CREATE POLICY "Users can manage their own IP logs" ON public.ip_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a separate policy for admins to have full access
CREATE POLICY "Admin has full access to all IP logs" ON public.ip_logs
USING (is_admin())
WITH CHECK (is_admin());

-- ========================================================
-- Fix the is_admin() function if needed
-- ========================================================

-- Make sure the is_admin function is properly defined
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- ========================================================
-- Setup trigger for last_active updates
-- ========================================================

-- Create/update function to handle last_active updates
CREATE OR REPLACE FUNCTION public.update_last_active_from_ip_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last_active timestamp for the user who just logged in
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update last_active when new IP log is created
DROP TRIGGER IF EXISTS update_last_active_on_ip_log ON public.ip_logs;
CREATE TRIGGER update_last_active_on_ip_log
AFTER INSERT ON public.ip_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_last_active_from_ip_log();

COMMIT;
