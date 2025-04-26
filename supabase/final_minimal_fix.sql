-- MINIMAL FIX FOR TRACKING WITHOUT SECURITY ISSUES
-- Addresses both issues without exposing auth.users

BEGIN;

-- ===============================================
-- STEP 1: Fix the RLS policies
-- ===============================================

-- Fix profiles RLS
DROP POLICY IF EXISTS "Admin has full access to profiles" ON public.profiles;
CREATE POLICY "Admin has full access to profiles" ON public.profiles
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Fix ip_logs RLS 
DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
CREATE POLICY "Users can insert their own IP logs" ON public.ip_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ===============================================
-- STEP 2: Fix the IP recording function
-- ===============================================

-- No need for views or complex functions
CREATE OR REPLACE FUNCTION record_ip_and_update_last_active(
  user_id uuid,
  ip_address text,
  user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Record IP
  INSERT INTO public.ip_logs (user_id, ip_address, user_agent, created_at)
  VALUES (user_id, ip_address, user_agent, NOW());
  
  -- Update last_active
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = user_id;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION record_ip_and_update_last_active TO authenticated;

COMMIT;
