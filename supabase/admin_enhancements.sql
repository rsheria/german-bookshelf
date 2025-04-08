-- Admin Panel Enhancements SQL
-- This file contains the schema changes needed for enhanced admin functionality

-- 1. IP Tracking Table
CREATE TABLE IF NOT EXISTS public.ip_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  location JSONB, -- Will store geolocation data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Index for faster lookups
  CONSTRAINT ip_logs_user_id_idx UNIQUE (user_id, ip_address, created_at)
);

-- Grant access to the authenticated users (needed for RLS)
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ip_logs TO authenticated;
GRANT ALL ON public.ip_logs TO service_role;

-- RLS policies for IP logs
CREATE POLICY "Admins can view all IP logs" 
  ON public.ip_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can only view their own IP logs" 
  ON public.ip_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 2. User Ban System
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  reason TEXT,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Make sure either user_id or ip_address is provided
  CONSTRAINT user_bans_target_check CHECK (
    (user_id IS NOT NULL) OR (ip_address IS NOT NULL)
  )
);

-- Grant access to the authenticated users (needed for RLS)
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;

-- RLS policies for bans
CREATE POLICY "Admins can manage all bans" 
  ON public.user_bans 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can only view their own bans" 
  ON public.user_bans 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 3. Online Status Tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Index for faster lookup
  CONSTRAINT user_sessions_session_id_key UNIQUE (session_id)
);

-- Grant access to the authenticated users (needed for RLS)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;

-- RLS policies for sessions
CREATE POLICY "Admins can view all sessions" 
  ON public.user_sessions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can only view/update their own sessions" 
  ON public.user_sessions 
  FOR ALL
  USING (auth.uid() = user_id);

-- 4. Enhance the Activity Logs with IP Address field if not already present
ALTER TABLE IF EXISTS public.activity_logs
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 5. Function to check if a user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(check_user_id UUID DEFAULT NULL, check_ip TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  is_banned BOOLEAN;
BEGIN
  -- Handle case when both params are NULL
  IF check_user_id IS NULL AND check_ip IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE 
      ((check_user_id IS NOT NULL AND user_id = check_user_id) OR 
       (check_ip IS NOT NULL AND ip_address = check_ip))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO is_banned;
  
  RETURN is_banned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to record IP when user logs in
CREATE OR REPLACE FUNCTION public.record_user_ip()
RETURNS TRIGGER AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
BEGIN
  -- Extract IP from request headers if available
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION
    WHEN OTHERS THEN
      ip_addr := 'unknown';
      user_agent_str := 'unknown';
  END;
  
  INSERT INTO public.ip_logs (
    user_id,
    ip_address,
    user_agent
  )
  VALUES (
    NEW.id,
    ip_addr,
    user_agent_str
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to record IP on login
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.record_user_ip();

-- 7. Function to update user's last active timestamp
CREATE OR REPLACE FUNCTION public.update_user_last_active(p_user_id UUID, p_session_id TEXT)
RETURNS VOID AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
BEGIN
  -- Extract IP from request headers if available
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION
    WHEN OTHERS THEN
      ip_addr := 'unknown';
      user_agent_str := 'unknown';
  END;

  -- Update the session's last active timestamp
  UPDATE public.user_sessions
  SET last_active_at = now()
  WHERE user_id = p_user_id AND session_id = p_session_id;
  
  -- If no matching session, create a new one
  IF NOT FOUND THEN
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      ip_address,
      user_agent
    )
    VALUES (
      p_user_id,
      p_session_id,
      ip_addr,
      user_agent_str
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to end a user session
CREATE OR REPLACE FUNCTION public.end_user_session(p_user_id UUID, p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_sessions
  SET 
    ended_at = now(),
    is_active = false
  WHERE user_id = p_user_id AND session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to get users currently online (active in last 15 minutes)
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  last_active TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at > (now() - interval '15 minutes')
  ORDER BY us.user_id, us.last_active_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to get detailed download stats for users
CREATE OR REPLACE FUNCTION public.get_user_download_stats(lookup_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_downloads BIGINT,
  downloads_today BIGINT,
  downloads_this_week BIGINT,
  downloads_this_month BIGINT
) AS $$
DECLARE
  today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now());
  week_start TIMESTAMP WITH TIME ZONE := date_trunc('week', now());
  month_start TIMESTAMP WITH TIME ZONE := date_trunc('month', now());
BEGIN
  RETURN QUERY
  WITH download_counts AS (
    SELECT
      dl.user_id,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE dl.downloaded_at >= today_start) as today,
      COUNT(*) FILTER (WHERE dl.downloaded_at >= week_start) as this_week,
      COUNT(*) FILTER (WHERE dl.downloaded_at >= month_start) as this_month
    FROM public.download_logs dl
    WHERE lookup_user_id IS NULL OR dl.user_id = lookup_user_id
    GROUP BY dl.user_id
  )
  SELECT
    dc.user_id,
    p.username,
    dc.total as total_downloads,
    dc.today as downloads_today,
    dc.this_week as downloads_this_week,
    dc.this_month as downloads_this_month
  FROM download_counts dc
  JOIN public.profiles p ON dc.user_id = p.id
  ORDER BY dc.total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to get activity count by action type
CREATE OR REPLACE FUNCTION public.get_activity_count_by_action()
RETURNS TABLE (
  action TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.action,
    COUNT(*) as count
  FROM public.activity_logs al
  GROUP BY al.action
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Function to get session statistics
CREATE OR REPLACE FUNCTION public.get_session_stats()
RETURNS TABLE (
  total_active_sessions BIGINT,
  users_online_now BIGINT,
  users_today BIGINT,
  avg_session_length_minutes NUMERIC
) AS $$
DECLARE
  today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now());
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.user_sessions WHERE is_active = true) AS total_active_sessions,
    (SELECT COUNT(DISTINCT user_id) FROM public.user_sessions 
     WHERE is_active = true AND last_active_at > (now() - interval '15 minutes')) AS users_online_now,
    (SELECT COUNT(DISTINCT user_id) FROM public.user_sessions 
     WHERE last_active_at >= today_start) AS users_today,
    (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at)) / 60), 0)
     FROM public.user_sessions 
     WHERE ended_at IS NOT NULL) AS avg_session_length_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Function to ban a user or IP address
CREATE OR REPLACE FUNCTION public.ban_user(
  p_admin_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_ban_id UUID;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL AND p_ip_address IS NULL THEN
    RAISE EXCEPTION 'Either user_id or ip_address must be provided';
  END IF;

  -- Check if admin has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only administrators can ban users';
  END IF;

  -- Create the ban record
  INSERT INTO public.user_bans (
    user_id,
    ip_address,
    reason,
    banned_by,
    expires_at
  ) VALUES (
    p_user_id,
    p_ip_address,
    p_reason,
    p_admin_id,
    p_expires_at
  )
  RETURNING id INTO new_ban_id;

  -- Log the admin action
  INSERT INTO public.activity_logs (
    user_id,
    username,
    action,
    entity_id,
    entity_type,
    entity_name,
    details
  )
  SELECT
    p_admin_id,
    (SELECT username FROM public.profiles WHERE id = p_admin_id),
    'ADMIN_ACTION',
    COALESCE(p_user_id::text, p_ip_address),
    'USER_BAN',
    COALESCE((SELECT username FROM public.profiles WHERE id = p_user_id), p_ip_address),
    jsonb_build_object(
      'reason', p_reason,
      'expires_at', p_expires_at,
      'ban_id', new_ban_id
    );

  RETURN new_ban_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Function to unban a user or IP
CREATE OR REPLACE FUNCTION public.unban_user(
  p_admin_id UUID,
  p_ban_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  banned_user_id UUID;
  banned_ip TEXT;
  ban_reason TEXT;
BEGIN
  -- Check if admin has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only administrators can unban users';
  END IF;

  -- Get ban details before updating
  SELECT user_id, ip_address, reason
  INTO banned_user_id, banned_ip, ban_reason
  FROM public.user_bans
  WHERE id = p_ban_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update the ban record to inactive
  UPDATE public.user_bans
  SET 
    is_active = false,
    expires_at = now()
  WHERE id = p_ban_id;

  -- Log the admin action
  INSERT INTO public.activity_logs (
    user_id,
    username,
    action,
    entity_id,
    entity_type,
    entity_name,
    details
  )
  SELECT
    p_admin_id,
    (SELECT username FROM public.profiles WHERE id = p_admin_id),
    'ADMIN_ACTION',
    COALESCE(banned_user_id::text, banned_ip),
    'USER_UNBAN',
    COALESCE((SELECT username FROM public.profiles WHERE id = banned_user_id), banned_ip),
    jsonb_build_object(
      'original_reason', ban_reason,
      'ban_id', p_ban_id
    );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_action TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_log_id UUID;
  ip_addr TEXT;
  user_agent_str TEXT;
BEGIN
  -- Extract IP from request headers if not provided and if available
  IF p_ip_address IS NULL THEN
    BEGIN
      ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
      user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
    EXCEPTION
      WHEN OTHERS THEN
        ip_addr := 'unknown';
        user_agent_str := 'unknown';
    END;
  ELSE
    ip_addr := p_ip_address;
    user_agent_str := NULL;
  END IF;

  -- Insert activity log
  INSERT INTO public.activity_logs (
    user_id,
    username,
    action,
    entity_id,
    entity_type,
    entity_name,
    details,
    ip_address,
    user_agent
  )
  SELECT
    p_user_id,
    (SELECT username FROM public.profiles WHERE id = p_user_id),
    p_action,
    p_entity_id,
    p_entity_type,
    p_entity_name,
    p_details,
    ip_addr,
    user_agent_str
  RETURNING id INTO new_log_id;

  RETURN new_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Function to update user quota (daily and monthly)
CREATE OR REPLACE FUNCTION public.update_user_quota(
  p_user_id UUID,
  p_daily_quota INTEGER,
  p_monthly_request_quota INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate inputs
  IF p_daily_quota < 0 OR p_monthly_request_quota < 0 THEN
    RAISE EXCEPTION 'Quota values cannot be negative';
  END IF;

  -- Update the user's quotas
  UPDATE public.profiles
  SET 
    daily_quota = p_daily_quota,
    monthly_request_quota = p_monthly_request_quota
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Log the quota change
  INSERT INTO public.activity_logs (
    user_id,
    username,
    action,
    entity_id,
    entity_type,
    entity_name,
    details
  )
  SELECT
    auth.uid(),
    (SELECT username FROM public.profiles WHERE id = auth.uid()),
    'ADMIN_ACTION',
    p_user_id::text,
    'QUOTA_UPDATE',
    (SELECT username FROM public.profiles WHERE id = p_user_id),
    jsonb_build_object(
      'daily_quota', p_daily_quota,
      'monthly_request_quota', p_monthly_request_quota
    );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add permissions for the functions
GRANT EXECUTE ON FUNCTION public.is_user_banned TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_last_active TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_download_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_count_by_action TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.ban_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.unban_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_quota TO authenticated;
