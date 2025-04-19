-- Create a function to count unique daily downloads per user
CREATE OR REPLACE FUNCTION count_unique_daily_downloads(uid uuid)
RETURNS bigint AS $$
  SELECT COUNT(DISTINCT book_id)
  FROM download_logs
  WHERE user_id = uid
    AND downloaded_at >= date_trunc('day', now());
$$ LANGUAGE SQL STABLE;

-- Grant execute permission if needed
GRANT EXECUTE ON FUNCTION count_unique_daily_downloads(uuid) TO public;
