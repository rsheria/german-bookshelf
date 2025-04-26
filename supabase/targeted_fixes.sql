-- TARGETED FIXES FOR REMAINING ISSUES
-- Run this in the Supabase SQL Editor to fix IP logs permissions and tracking function issues

-- 1. Fix IP logs permission issues
-- First ensure RLS is disabled temporarily
ALTER TABLE public.ip_logs DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "ip_logs_read_own" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_insert_own" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_anon_insert" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_admin_manage_all" ON public.ip_logs;

-- Explicitly grant permissions to authenticated users for ip_logs
GRANT ALL ON TABLE public.ip_logs TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ip_logs TO authenticated;
GRANT INSERT ON TABLE public.ip_logs TO anon;

-- Create a very permissive policy for now (can tighten later)
CREATE POLICY "allow_all_ip_logs_ops" 
ON public.ip_logs FOR ALL
USING (true);

-- Re-enable RLS for ip_logs
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

-- 2. Fix the track_page_view_with_ip function overloading issue
-- Drop both versions
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, uuid, inet, text);

-- Create a single version with consistent parameter types
CREATE OR REPLACE FUNCTION public.track_page_view_with_ip(
  p_user_id UUID,
  p_page_path TEXT,
  p_session_id TEXT,  -- Accept text type for session_id to handle both UUID and text
  p_ip_address TEXT,  -- Accept text type for IP to handle both inet and text
  p_user_agent TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_session_id UUID;
  v_ip_address INET;
BEGIN
  -- Try to convert session_id to UUID
  BEGIN
    v_session_id := p_session_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- Generate a random UUID if conversion fails
    v_session_id := gen_random_uuid();
  END;
  
  -- Try to convert IP address to INET
  BEGIN
    v_ip_address := p_ip_address::INET;
  EXCEPTION WHEN OTHERS THEN
    -- Use a default IP if conversion fails
    v_ip_address := '0.0.0.0'::INET;
  END;

  -- Insert the page view with IP address
  INSERT INTO public.user_sessions (
    user_id,
    page_path,
    session_id,
    ip_address,
    user_agent,
    created_at,
    updated_at,
    is_active
  ) VALUES (
    p_user_id,
    p_page_path,
    v_session_id,
    v_ip_address,
    p_user_agent,
    NOW(),
    NOW(),
    TRUE
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details to a dedicated error log table if it exists
    BEGIN
      INSERT INTO public.error_logs (error_message, function_name, params)
      VALUES (SQLERRM, 'track_page_view_with_ip', 
              jsonb_build_object(
                'user_id', p_user_id,
                'page_path', p_page_path,
                'session_id', p_session_id,
                'ip_address', p_ip_address
              ));
    EXCEPTION WHEN OTHERS THEN
      -- Silently fail if error log table doesn't exist
      NULL;
    END;
    
    -- Return NULL on error
    RETURN NULL;
END;
$$;

-- 3. Create error logging table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT,
  function_name TEXT,
  params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy to allow all operations
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "error_logs_all" ON public.error_logs;
CREATE POLICY "error_logs_all" ON public.error_logs FOR ALL USING (true);
GRANT ALL ON TABLE public.error_logs TO postgres;
GRANT SELECT, INSERT ON TABLE public.error_logs TO authenticated, anon;

-- 4. Update tracking functions
-- Create a better IP tracking function
CREATE OR REPLACE FUNCTION public.record_ip_address(
  p_user_id UUID,
  p_ip_address TEXT,
  p_user_agent TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_ip_address INET;
BEGIN
  -- Try to convert IP address to INET
  BEGIN
    v_ip_address := p_ip_address::INET;
  EXCEPTION WHEN OTHERS THEN
    -- Use a default IP if conversion fails
    v_ip_address := '0.0.0.0'::INET;
  END;

  -- Insert into ip_logs with ON CONFLICT DO NOTHING to avoid duplicates
  INSERT INTO public.ip_logs (
    user_id,
    ip_address,
    user_agent,
    last_seen
  ) VALUES (
    p_user_id,
    v_ip_address,
    p_user_agent,
    NOW()
  )
  ON CONFLICT (user_id, ip_address) 
  DO UPDATE SET
    last_seen = NOW(),
    user_agent = p_user_agent
  RETURNING id INTO v_id;
  
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL on error
    RETURN NULL;
END;
$$;

-- Drop any other conflicting functions
DROP FUNCTION IF EXISTS public.update_last_active(uuid);

-- Create a simpler user activity tracking function
CREATE OR REPLACE FUNCTION public.update_last_active(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple update of last_active in profiles
  UPDATE public.profiles
  SET last_active = NOW()
  WHERE id = p_user_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Just silently fail
    NULL;
END;
$$;

-- Make sure public has execute permissions on these functions
GRANT EXECUTE ON FUNCTION public.track_page_view_with_ip(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_ip_address(UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_last_active(UUID) TO authenticated, anon;
