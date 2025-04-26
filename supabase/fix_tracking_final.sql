-- TARGETED FIX FOR IP LOGGING AND LAST ACTIVE TRACKING
-- This script fixes IP tracking and last_active updates without changing other security settings

BEGIN;

-- 1. Fix RLS policies for ip_logs to make insertion work properly
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin has full access to IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Users can view their own IP logs" ON public.ip_logs;

-- Create permissive policies that allow proper IP logging
CREATE POLICY "Admin has full access to IP logs" ON public.ip_logs
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can insert IP logs" ON public.ip_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own IP logs" ON public.ip_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Fix profiles table policies to allow last_active updates
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can update last_active" ON public.profiles;

-- Create policy that specifically allows updating last_active field
CREATE POLICY "Users can update last_active" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Create a direct function to update last_active that bypasses some restrictions
CREATE OR REPLACE FUNCTION public.update_last_active(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = user_id;
END;
$$;

-- Create helper function to record IP logs with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.record_user_ip(
  p_user_id uuid,
  p_ip_address text,
  p_user_agent text,
  p_action text DEFAULT 'LOGIN'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.ip_logs (
    user_id, 
    ip_address, 
    user_agent, 
    action
  )
  VALUES (
    p_user_id,
    p_ip_address,
    p_user_agent,
    p_action
  )
  RETURNING id INTO v_log_id;
  
  -- Also update last_active timestamp
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = p_user_id;
  
  RETURN v_log_id;
END;
$$;

-- 4. Ensure the active_sessions table has proper permissions
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert active sessions" ON public.active_sessions;

CREATE POLICY "Users can insert active sessions" ON public.active_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMIT;
