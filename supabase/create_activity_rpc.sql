-- Create RPC functions for activity logs
BEGIN;

-- Function to get activity counts by action type
CREATE OR REPLACE FUNCTION get_activity_count_by_action()
RETURNS TABLE (action TEXT, count BIGINT) AS $$
DECLARE
  -- Set cutoff date to one month ago
  month_ago TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '1 month';
BEGIN
  RETURN QUERY
  SELECT 
    activity_logs.action, 
    COUNT(*)::BIGINT
  FROM 
    activity_logs
  WHERE 
    created_at >= month_ago
  GROUP BY 
    activity_logs.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_activity_count_by_action() TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_count_by_action() TO service_role;

COMMIT;
