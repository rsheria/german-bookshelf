-- CORE TRACKING FUNCTIONS FIX
-- These are the essential functions needed by the admin panel

-- Drop and recreate the get_online_users function
DROP FUNCTION IF EXISTS public.get_online_users();

CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamp with time zone,
  ip_address text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.username,
    s.last_active_at as last_active,
    s.ip_address
  FROM public.profiles p
  JOIN public.user_sessions s ON p.id = s.user_id
  WHERE s.is_active = true
  AND s.last_active_at > NOW() - INTERVAL '15 minutes'
  ORDER BY s.last_active_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent activity
DROP FUNCTION IF EXISTS public.get_recent_activity(integer);

CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  username text, 
  action text,
  entity_type text,
  entity_name text,  
  created_at timestamp with time zone,
  ip_address text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id::uuid,
    a.username,
    a.action,
    a.entity_type,
    a.entity_name,
    a.created_at,
    a.ip_address
  FROM
    public.activity_logs a
  ORDER BY
    a.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user activity
DROP FUNCTION IF EXISTS public.get_user_activity(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_user_activity(p_user_id uuid, limit_count integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  action text,
  entity_type text,
  entity_name text,
  created_at timestamp with time zone,
  ip_address text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id::uuid,
    a.action,
    a.entity_type,
    a.entity_name,
    a.created_at,
    a.ip_address
  FROM
    public.activity_logs a
  WHERE
    a.entity_id = p_user_id::text
    AND a.entity_type = 'user'
  ORDER BY
    a.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
