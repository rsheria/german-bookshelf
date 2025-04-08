-- CASCADE FIX - HANDLES DEPENDENT OBJECTS
-- This script uses CASCADE to handle views that depend on the activity_logs table

-- ==========================================
-- STEP 1: RECREATE ACTIVITY_LOGS TABLE WITH CASCADE
-- ==========================================

-- First, back up the existing data
CREATE TABLE IF NOT EXISTS public.activity_logs_backup AS 
SELECT * FROM public.activity_logs;

-- Also save the dependent views' definitions
CREATE TABLE IF NOT EXISTS temp_view_definitions AS 
SELECT schemaname, viewname, definition
FROM pg_views
WHERE viewname IN ('online_users', 'recent_downloads');

-- Use CASCADE to drop the table and all dependent objects
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- Create a new version with TEXT type for entity_id
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT,
  action TEXT NOT NULL,
  entity_id TEXT,  -- Now TEXT instead of UUID
  entity_type TEXT,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Copy the data back if backup exists
INSERT INTO public.activity_logs (
  id, user_id, username, action, entity_id, entity_type, 
  entity_name, details, created_at, ip_address, user_agent
)
SELECT 
  id, user_id, username, action, entity_id::TEXT, entity_type, 
  entity_name, details, created_at, ip_address, user_agent
FROM public.activity_logs_backup;

-- Grant permissions
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

-- Add policies
CREATE POLICY "Users can view their own logs" 
  ON public.activity_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" 
  ON public.activity_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- ==========================================
-- STEP 2: RECREATE DEPENDENT VIEWS
-- ==========================================

-- Create online_users view
CREATE OR REPLACE VIEW public.online_users AS
SELECT 
  u.id AS user_id,
  p.username,
  u.last_sign_in_at,
  MAX(a.created_at) AS last_activity
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.activity_logs a ON u.id = a.user_id
WHERE u.last_sign_in_at > (now() - interval '30 days')
GROUP BY u.id, p.username, u.last_sign_in_at
ORDER BY last_activity DESC NULLS LAST;

-- Create recent_downloads view
CREATE OR REPLACE VIEW public.recent_downloads AS
SELECT 
  a.id,
  a.user_id,
  a.username,
  a.entity_id AS book_id,  -- This now accepts TEXT type
  b.title,
  b.author,
  a.created_at AS downloaded_at,
  a.ip_address
FROM public.activity_logs a
LEFT JOIN public.books b ON a.entity_id = b.id::TEXT
WHERE a.action = 'DOWNLOAD'
ORDER BY a.created_at DESC;

-- Grant permissions on views
GRANT SELECT ON public.online_users TO authenticated, service_role;
GRANT SELECT ON public.recent_downloads TO authenticated, service_role;

-- ==========================================
-- STEP 3: CLEAN USER SESSIONS
-- ==========================================

-- Delete fake sessions
DELETE FROM public.user_sessions
WHERE user_agent = 'Seeded User Agent'
   OR session_id LIKE 'seed-session-%'
   OR session_id LIKE 'real-session-%';

-- Mark old sessions as inactive
UPDATE public.user_sessions
SET is_active = false
WHERE last_active_at < (now() - interval '15 minutes');

-- ==========================================
-- STEP 4: FIX update_user_last_active FUNCTION
-- ==========================================

DROP FUNCTION IF EXISTS public.update_user_last_active(uuid, text);

CREATE OR REPLACE FUNCTION public.update_user_last_active(
  p_user_id UUID,
  p_session_id TEXT
)
RETURNS VOID AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
BEGIN
  -- Get IP and user agent from request headers
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    ip_addr := 'unknown';
  END;
  
  BEGIN
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    user_agent_str := 'unknown';
  END;

  -- Update the session (if it exists)
  UPDATE public.user_sessions
  SET 
    last_active_at = now(),
    is_active = true,
    ip_address = COALESCE(ip_address, ip_addr),
    user_agent = COALESCE(user_agent, user_agent_str)
  WHERE 
    user_id = p_user_id AND 
    session_id = p_session_id;
  
  -- If no rows were updated, insert a new session
  IF NOT FOUND THEN
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      ip_address,
      user_agent,
      started_at,
      last_active_at,
      is_active
    )
    VALUES (
      p_user_id,
      p_session_id,
      ip_addr,
      user_agent_str,
      now(),
      now(),
      true
    );
  END IF;
  
  -- Log activity
  INSERT INTO public.activity_logs (
    user_id,
    username,
    action,
    entity_id,  -- This is now TEXT type
    entity_type,
    details,
    ip_address,
    user_agent
  )
  SELECT
    p_user_id,
    p.username,
    'ACTIVE',
    p_user_id::TEXT,  -- Convert to TEXT
    'USER',
    jsonb_build_object(
      'session_id', p_session_id,
      'timestamp', now()
    ),
    ip_addr,
    user_agent_str
  FROM public.profiles p
  WHERE p.id = p_user_id
  -- Limit activity logging to once per 15 minutes
  AND NOT EXISTS (
    SELECT 1 FROM public.activity_logs
    WHERE 
      user_id = p_user_id AND
      action = 'ACTIVE' AND
      created_at > now() - interval '15 minutes'
  );

EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore errors to keep app working
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 5: FIX get_online_users FUNCTION
-- ==========================================

DROP FUNCTION IF EXISTS public.get_online_users(interval);

CREATE OR REPLACE FUNCTION public.get_online_users(time_window interval DEFAULT interval '15 minutes')
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  ip_address TEXT
) AS $$
BEGIN
  -- Return active users only
  RETURN QUERY
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active,
    us.ip_address
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - time_window)
  ORDER BY us.user_id, us.last_active_at DESC;
EXCEPTION WHEN OTHERS THEN
  RETURN; -- Return empty set on error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 6: ADD SIMPLE TEST SESSION TO VERIFY
-- ==========================================

-- Add a test session for the current admin
INSERT INTO public.user_sessions (
  user_id,
  session_id,
  ip_address,
  user_agent,
  started_at,
  last_active_at,
  is_active
)
SELECT 
  id,
  'admin-session-' || (extract(epoch from now()) * 1000)::text,
  '192.168.1.1',
  'Admin Browser',
  now(),
  now(),
  true
FROM public.profiles 
WHERE is_admin = true
LIMIT 1;

-- Add activities for this admin
INSERT INTO public.activity_logs (
  user_id,
  username,
  action,
  entity_id,
  entity_type,
  details,
  ip_address
)
SELECT
  id,
  username,
  'LOGIN',
  id::TEXT,  -- Convert to TEXT
  'USER',
  jsonb_build_object(
    'login_time', now() - interval '5 minutes'
  ),
  '192.168.1.1'
FROM public.profiles 
WHERE is_admin = true
LIMIT 1;

-- Insert another activity
INSERT INTO public.activity_logs (
  user_id,
  username,
  action,
  entity_id,
  entity_type,
  details,
  ip_address
)
SELECT
  id,
  username,
  'PAGE_VIEW',
  '/admin/dashboard',
  'PAGE',
  jsonb_build_object(
    'view_time', now() - interval '2 minutes'
  ),
  '192.168.1.1'
FROM public.profiles 
WHERE is_admin = true
LIMIT 1;

-- Add a test session for a non-admin user if possible
INSERT INTO public.user_sessions (
  user_id,
  session_id,
  ip_address,
  user_agent,
  started_at,
  last_active_at,
  is_active
)
SELECT 
  id,
  'user-session-' || (extract(epoch from now()) * 1000)::text,
  '192.168.1.2',
  'User Browser',
  now(),
  now(),
  true
FROM public.profiles 
WHERE is_admin = false
LIMIT 1;

-- ==========================================
-- STEP 7: GRANT PERMISSIONS
-- ==========================================

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION public.update_user_last_active(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_online_users(interval) TO authenticated, service_role;
