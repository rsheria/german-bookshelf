-- Fix for Last Active and IP recording functionality
BEGIN;

-- 1. Fix update_user_last_active function to ensure it works correctly
CREATE OR REPLACE FUNCTION public.update_user_last_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- 2. Ensure the trigger exists on active_sessions table
DROP TRIGGER IF EXISTS update_last_active ON public.active_sessions;
CREATE TRIGGER update_last_active
AFTER INSERT OR UPDATE ON public.active_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_last_active();

-- 3. Fix active_sessions RLS to ensure proper tracking
DROP POLICY IF EXISTS "Admin has full access to active sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can view their own active sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can insert their own active sessions" ON public.active_sessions;

-- Create better policies for active_sessions
CREATE POLICY "Admin has full access to active sessions" ON public.active_sessions
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can view their own active sessions" ON public.active_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own active sessions" ON public.active_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Make sure proper access exists for profiles table last_active updates
DROP POLICY IF EXISTS "System can update profile last_active" ON public.profiles;
CREATE POLICY "System can update profile last_active" ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 5. Make sure the IP logging function is working correctly
CREATE OR REPLACE FUNCTION public.log_user_ip() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ip_logs (user_id, ip_address, user_agent, action)
  VALUES (
    NEW.user_id,
    NEW.ip_address,
    NEW.user_agent,
    'SESSION_CREATED'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on active_sessions for IP logging
DROP TRIGGER IF EXISTS log_ip_on_session_create ON public.active_sessions;
CREATE TRIGGER log_ip_on_session_create
AFTER INSERT ON public.active_sessions
FOR EACH ROW
EXECUTE FUNCTION public.log_user_ip();

COMMIT;
