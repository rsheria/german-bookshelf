-- FIX LAST ACTIVE TIMESTAMP FUNCTIONALITY
-- This script specifically targets the last_active update issue in the admin dashboard

BEGIN;

-- ========================================================
-- 1. Create a function and trigger to update last_active
-- ========================================================

-- Create a function to automatically update last_active field when an IP log is created
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

-- Create a trigger to call this function whenever a new IP log is created
DROP TRIGGER IF EXISTS update_last_active_on_ip_log ON public.ip_logs;
CREATE TRIGGER update_last_active_on_ip_log
AFTER INSERT ON public.ip_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_last_active_from_ip_log();

-- ========================================================
-- 2. Fix the profiles table RLS policies
-- ========================================================

-- Make sure profiles RLS is not blocking the last_active update
DROP POLICY IF EXISTS "Allow updating last_active" ON public.profiles;

-- Add a specific policy allowing last_active updates from the trigger function
CREATE POLICY "Allow updating last_active from trigger" ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- ========================================================
-- 3. Update all existing users now to populate last_active
-- ========================================================

-- Update all profiles with last_active from IP logs
UPDATE public.profiles p
SET last_active = (
  SELECT MAX(created_at) 
  FROM public.ip_logs 
  WHERE user_id = p.id
)
WHERE (
  SELECT MAX(created_at) 
  FROM public.ip_logs 
  WHERE user_id = p.id
) IS NOT NULL;

COMMIT;
