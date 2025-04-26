-- USER ACTIVITY FIX
-- This targets the specific remaining errors

-- 1. Fix the get_user_activity function with the exact parameter signature
DROP FUNCTION IF EXISTS public.get_user_activity(integer, uuid);
DROP FUNCTION IF EXISTS public.get_user_activity(integer, integer, uuid);

-- Create the function with the specific signature your code expects
CREATE FUNCTION public.get_user_activity(
  limit_count integer,
  p_user_id uuid
)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.activity_logs
  WHERE entity_id = p_user_id::text
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;

-- Also create the alternative version
CREATE FUNCTION public.get_user_activity(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL
)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.activity_logs
  WHERE 
    (p_user_id IS NULL OR entity_id = p_user_id::text)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- 2. Fix RLS on profiles to allow querying by date
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
  FOR SELECT
  USING (true);
  
-- 3. Create a workaround function for the admin API access issue
CREATE OR REPLACE FUNCTION public.get_user_details(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data json;
  activity_data json;
BEGIN
  -- Get basic user data
  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'email', p.email,
    'created_at', p.created_at
  ) INTO user_data
  FROM public.profiles p
  WHERE p.id = p_user_id;
  
  -- Get activity counts
  SELECT 
    json_build_object(
      'total', COUNT(*),
      'last_activity', MAX(created_at),
      'actions', COALESCE(
        (SELECT json_object_agg(action, count)
         FROM (
           SELECT action, COUNT(*) as count
           FROM public.activity_logs
           WHERE entity_id = p_user_id::text
           GROUP BY action
         ) action_counts
        ), '{}'::json
      )
    )
  INTO activity_data
  FROM public.activity_logs
  WHERE entity_id = p_user_id::text;
  
  -- Return combined data
  RETURN json_build_object(
    'user', user_data,
    'activity', activity_data,
    'sessions', NULL
  );
END;
$$;

-- 4. Update the get_online_users function to include real IP address
DROP FUNCTION IF EXISTS public.get_online_users();

CREATE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamptz,
  ip_address text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active,
    us.ip_address
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - interval '15 minutes')
  ORDER BY us.user_id, us.last_active_at DESC;
$$;
