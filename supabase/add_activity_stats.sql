-- Create the missing get_activity_stats function
CREATE OR REPLACE FUNCTION public.get_activity_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_count integer;
  week_count integer;
  month_count integer;
  action_counts json;
BEGIN
  -- Get today's activity count
  SELECT COUNT(*) INTO today_count
  FROM public.activity_logs
  WHERE created_at >= (CURRENT_DATE);
  
  -- Get week's activity count
  SELECT COUNT(*) INTO week_count
  FROM public.activity_logs
  WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days');
  
  -- Get month's activity count
  SELECT COUNT(*) INTO month_count
  FROM public.activity_logs
  WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');
  
  -- Get count by action
  SELECT 
    json_object_agg(action, count)
  INTO action_counts
  FROM (
    SELECT action, COUNT(*) as count
    FROM public.activity_logs
    GROUP BY action
  ) action_counts;
  
  -- Return all stats as JSON
  RETURN json_build_object(
    'today', today_count,
    'week', week_count,
    'month', month_count,
    'byAction', COALESCE(action_counts, '{}'::json)
  );
END;
$$;
