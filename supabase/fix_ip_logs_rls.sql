-- Fix RLS policies for ip_logs table
BEGIN;

-- Drop existing policies on ip_logs
DROP POLICY IF EXISTS "Users can view their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin has full access to IP logs" ON public.ip_logs;

-- Create policies for ip_logs table
-- 1. Admin policy - give full access to admins
CREATE POLICY "Admin has full access to IP logs" ON public.ip_logs
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2. Users can view their own IP logs
CREATE POLICY "Users can view their own IP logs" ON public.ip_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Allow inserting IP logs for the current user or for system-level logging
CREATE POLICY "Allow inserting IP logs" ON public.ip_logs FOR INSERT
  WITH CHECK (true);

COMMIT;
