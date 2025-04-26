-- FINAL SOLUTION: April 25, 2025
-- Handles all existing functions and dependencies

BEGIN;

-- ===================================
-- 1. CLEAN UP ALL EXISTING OBJECTS
-- ===================================

-- First try to drop all existing triggers
DROP TRIGGER IF EXISTS update_last_active_trigger ON public.ip_logs;
DROP TRIGGER IF EXISTS update_last_active_on_ip_log_trigger ON public.ip_logs;
DROP TRIGGER IF EXISTS update_last_active_on_ip_insert ON public.ip_logs;
DROP TRIGGER IF EXISTS update_last_active_april_25_trigger ON public.ip_logs;

-- Now drop all functions (after triggers are gone)
DO $$
BEGIN
  BEGIN
    DROP FUNCTION IF EXISTS update_last_active_trigger_function();
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Drop function 1 failed: %', SQLERRM;
  END;
  
  BEGIN
    DROP FUNCTION IF EXISTS update_last_active_on_ip_log();
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Drop function 2 failed: %', SQLERRM;
  END;
  
  BEGIN
    DROP FUNCTION IF EXISTS update_last_active();
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Drop function 3 failed: %', SQLERRM;
  END;
END$$;

-- ===================================
-- 2. CREATE NECESSARY POLICIES
-- ===================================

-- Policy for profiles table
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;

-- Ensure admin can do everything
CREATE POLICY "Admin full access to profiles" ON public.profiles
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Allow users to update their own profiles (including last_active)
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy for ip_logs table
DROP POLICY IF EXISTS "Users can insert own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Users can view own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin full access to ip logs" ON public.ip_logs;

-- Allow users to insert their own IP logs
CREATE POLICY "Users can insert own IP logs" ON public.ip_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own IP logs
CREATE POLICY "Users can view own IP logs" ON public.ip_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admin full access to ip_logs for all operations
CREATE POLICY "Admin full access to ip logs" ON public.ip_logs
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ===================================
-- 3. CREATE FUNCTION AND TRIGGER
-- ===================================

-- Create new function with unique name
CREATE OR REPLACE FUNCTION update_last_active_april_25()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
AS $$
BEGIN
    UPDATE public.profiles SET last_active = NOW() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;

-- Create trigger with unique name
CREATE TRIGGER update_last_active_april_25_trigger
AFTER INSERT OR UPDATE ON public.ip_logs
FOR EACH ROW
EXECUTE FUNCTION update_last_active_april_25();

COMMIT;
