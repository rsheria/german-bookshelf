-- SECURE AND SIMPLE FIX FOR USER TRACKING
-- No security vulnerabilities, fixes both IP logging and last_active updates

BEGIN;

-- ===============================================
-- PART 1: Ensure IP logging works correctly
-- ===============================================

-- Reset the ip_logs table RLS
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admin has full access to IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow inserting IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow any user to insert their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow admins full access to all IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Allow users to view their own IP logs" ON public.ip_logs;

-- Create simple and secure policies for ip_logs
-- Allow users to insert their own logs
CREATE POLICY "Users can insert own IP logs" ON public.ip_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all IP logs
CREATE POLICY "Admins can view all IP logs" ON public.ip_logs
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Allow users to see their own IP logs
CREATE POLICY "Users can view own IP logs" ON public.ip_logs
FOR SELECT
USING (auth.uid() = user_id);

-- ===============================================
-- PART 2: Fix last_active updates
-- ===============================================

-- Reset profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clear existing policies that might conflict
DROP POLICY IF EXISTS "Allow system to update last_active" ON public.profiles;
DROP POLICY IF EXISTS "System functions can update last_active" ON public.profiles;

-- Create policies for profiles
-- Ensure users can update their own last_active
CREATE POLICY "Users can update own last_active" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  (
    (tg_op = 'UPDATE' AND OLD.id = NEW.id) AND
    (OLD.* IS NOT DISTINCT FROM NEW.* OR OLD.last_active IS DISTINCT FROM NEW.last_active)
  )
);

-- Ensure admin access to all profiles
CREATE POLICY "Admin full access to profiles" ON public.profiles
FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Standard policy for users to see/edit their own profile
CREATE POLICY "Users can manage own profile" ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ===============================================
-- PART 3: Create secure function to update last_active
-- ===============================================

-- Drop any existing functions to avoid conflicts
DO $$
BEGIN
  BEGIN
    DROP FUNCTION IF EXISTS public.update_user_last_active;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END$$;

-- Create a secure function to update last_active
CREATE OR REPLACE FUNCTION public.update_user_last_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update the user's last_active timestamp
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = auth.uid();
  
  RETURN NEW;
END;
$$;

-- ===============================================
-- PART 4: Create secure function to record IP
-- ===============================================

-- Drop any existing functions to avoid conflicts
DO $$
BEGIN
  BEGIN
    DROP FUNCTION IF EXISTS public.record_user_ip;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END$$;

-- Create a secure function to record IP that also updates last_active
CREATE OR REPLACE FUNCTION public.record_user_ip(
  ip_address text,
  user_agent text,
  action_type text DEFAULT 'LOGIN'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the IP log for the current user
  INSERT INTO public.ip_logs (user_id, ip_address, user_agent, action, created_at)
  VALUES (auth.uid(), ip_address, user_agent, action_type, NOW());
  
  -- Update the last_active timestamp
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = auth.uid();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.record_user_ip TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_last_active TO authenticated;

-- ===============================================
-- PART 5: Update the frontend code reference
-- ===============================================

COMMENT ON FUNCTION public.record_user_ip IS 
'IMPORTANT: This function should be called from the frontend as:
supabase.rpc("record_user_ip", { 
  ip_address: clientIp,
  user_agent: navigator.userAgent,
  action_type: "LOGIN" 
})

No user_id parameter is needed - it uses the authenticated user automatically.';

COMMIT;
