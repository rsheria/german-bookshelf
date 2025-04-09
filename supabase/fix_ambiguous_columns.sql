-- FIX AMBIGUOUS COLUMN REFERENCES
-- Fixes the "column reference user_id is ambiguous" error

-- Update the get_online_users function with fully qualified column names
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamp with time zone,
  ip_address text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.username,
    GREATEST(s.last_active_at, p.last_sign_in) AS last_active,
    s.ip_address
  FROM 
    public.profiles p
  LEFT JOIN (
    -- Get only the most recent session for each user
    SELECT DISTINCT ON (us.user_id)
      us.user_id,
      us.last_active_at,
      us.ip_address
    FROM
      public.user_sessions us
    WHERE
      us.is_active = true
      AND us.last_active_at > NOW() - INTERVAL '15 minutes'
    ORDER BY
      us.user_id,
      us.last_active_at DESC
  ) s ON p.id = s.user_id
  WHERE 
    -- Only show users who have been active recently
    (s.last_active_at IS NOT NULL OR p.last_sign_in > NOW() - INTERVAL '15 minutes')
  ORDER BY
    p.id,
    COALESCE(s.last_active_at, p.last_sign_in) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
