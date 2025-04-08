-- RESTORE ADMIN PANEL FEATURES
-- This script safely reinstates admin features like user banning, IP tracking, and online users

-- ==========================================
-- PART 1: RECREATE REQUIRED TABLES
-- ==========================================

-- 1.1 IP Tracking Table
CREATE TABLE IF NOT EXISTS public.ip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  location JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions and enable RLS
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ip_logs TO authenticated;
GRANT ALL ON public.ip_logs TO service_role;

-- RLS policies for IP logs
DROP POLICY IF EXISTS "Admins can view all IP logs" ON public.ip_logs;
CREATE POLICY "Admins can view all IP logs" 
  ON public.ip_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can only view their own IP logs" ON public.ip_logs;
CREATE POLICY "Users can only view their own IP logs" 
  ON public.ip_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 1.2 User Ban System
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Grant permissions and enable RLS
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;

-- RLS policies for bans
DROP POLICY IF EXISTS "Admins can manage all bans" ON public.user_bans;
CREATE POLICY "Admins can manage all bans" 
  ON public.user_bans 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can only view their own bans" ON public.user_bans;
CREATE POLICY "Users can only view their own bans" 
  ON public.user_bans 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 1.3 Online Status Tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Grant permissions and enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;

-- RLS policies for sessions
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
CREATE POLICY "Admins can view all sessions" 
  ON public.user_sessions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can only view/update their own sessions" ON public.user_sessions;
CREATE POLICY "Users can only view/update their own sessions" 
  ON public.user_sessions 
  FOR ALL
  USING (auth.uid() = user_id);

-- 1.4 Ensure activity_logs has required columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    -- Add columns if they don't exist
    ALTER TABLE public.activity_logs 
    ADD COLUMN IF NOT EXISTS ip_address TEXT,
    ADD COLUMN IF NOT EXISTS user_agent TEXT;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors
END
$$;

-- ==========================================
-- PART 2: CREATE REQUIRED FUNCTIONS
-- ==========================================

-- 2.1 More robust is_user_banned function
CREATE OR REPLACE FUNCTION public.is_user_banned(user_id UUID DEFAULT NULL, ip_address TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  is_banned BOOLEAN;
BEGIN
  -- Handle case when both params are NULL
  IF user_id IS NULL AND ip_address IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is banned by user_id or IP
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE 
      ((user_id IS NOT NULL AND user_bans.user_id = user_id) OR 
       (ip_address IS NOT NULL AND user_bans.ip_address = ip_address))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO is_banned;
  
  RETURN is_banned;

EXCEPTION WHEN OTHERS THEN
  -- On any error, allow login (return false)
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 Function to update user's last active timestamp
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

EXCEPTION WHEN OTHERS THEN
  -- Silently ignore errors to prevent blocking the app
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 Function to end a user session
CREATE OR REPLACE FUNCTION public.end_user_session(p_user_id UUID, p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_sessions
  SET 
    ended_at = now(),
    is_active = false
  WHERE user_id = p_user_id AND session_id = p_session_id;
EXCEPTION WHEN OTHERS THEN
  -- Silently ignore errors
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.4 Function to get users currently online
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
EXCEPTION WHEN OTHERS THEN
  -- Return empty set on error rather than failing
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.5 Function to get download statistics
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
  -- Make sure download_logs exists before querying it
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'download_logs'
  ) THEN
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
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Return empty set rather than failing
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.6 Function to ban a user
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

  -- Log the action if activity_logs exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
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
  END IF;

  RETURN new_ban_id;
EXCEPTION WHEN OTHERS THEN
  -- Return NULL but don't block the application
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.7 Function to record IP when user logs in
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
  
  -- Insert into ip_logs
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
EXCEPTION WHEN OTHERS THEN
  -- Always return NEW to prevent blocking authentication
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to record IP on login
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
    CREATE TRIGGER on_auth_user_login
      AFTER UPDATE ON auth.users
      FOR EACH ROW
      WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
      EXECUTE FUNCTION public.record_user_ip();
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors
END
$$;

-- ==========================================
-- PART 3: GRANT PERMISSIONS
-- ==========================================

-- Grant permissions for all functions
GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_last_active(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_user_session(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_download_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ban_user(UUID, UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_user_ip() TO service_role;
