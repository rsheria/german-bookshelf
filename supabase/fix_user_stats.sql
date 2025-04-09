-- FIX USER STATS COUNTING
-- This ensures accurate counting of total users and new users today

-- First, let's create a proper function to get user stats
CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS TABLE (
  total_users bigint,
  new_users_today bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Count distinct users from profiles table (accurate total)
    (SELECT COUNT(*) FROM public.profiles)::bigint AS total_users,
    
    -- Count only users who registered today (from profiles table)
    (SELECT COUNT(*) 
     FROM public.profiles 
     WHERE created_at::date = CURRENT_DATE)::bigint AS new_users_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Let's also fix the get_activity_stats function if it exists
CREATE OR REPLACE FUNCTION public.get_activity_stats()
RETURNS json AS $$
DECLARE
  result json;
  today timestamp;
  week timestamp;
  month timestamp;
BEGIN
  -- Set time boundaries
  today := date_trunc('day', now());
  week := today - interval '7 days';
  month := today - interval '30 days';
  
  -- Get activity counts
  SELECT json_build_object(
    'today', (SELECT COUNT(*) FROM public.activity_logs WHERE created_at >= today),
    'week', (SELECT COUNT(*) FROM public.activity_logs WHERE created_at >= week),
    'month', (SELECT COUNT(*) FROM public.activity_logs WHERE created_at >= month),
    'byAction', (
      SELECT json_object_agg(action, count)
      FROM (
        SELECT action, COUNT(*) as count
        FROM public.activity_logs
        GROUP BY action
        ORDER BY count DESC
      ) as action_counts
    ),
    'totalUsers', (SELECT COUNT(*) FROM public.profiles),
    'newUsersToday', (SELECT COUNT(*) FROM public.profiles WHERE created_at::date = CURRENT_DATE)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
