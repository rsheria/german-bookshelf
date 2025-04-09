-- FIX DUPLICATE ONLINE USERS
-- This ensures each user email only appears once in the online users list

-- Update the get_online_users function to return only distinct users
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamp with time zone,
  ip_address text
) AS $$
BEGIN
  RETURN QUERY
  -- Use DISTINCT ON to ensure each user only appears once
  SELECT DISTINCT ON (p.id)
    p.id,
    p.username,
    GREATEST(s.last_active_at, p.last_sign_in) AS last_active,
    s.ip_address
  FROM 
    profiles p
  LEFT JOIN (
    -- Get only the most recent session for each user
    SELECT DISTINCT ON (user_id)
      user_id,
      last_active_at,
      ip_address
    FROM
      user_sessions
    WHERE
      is_active = true
      AND last_active_at > NOW() - INTERVAL '15 minutes'
    ORDER BY
      user_id,
      last_active_at DESC
  ) s ON p.id = s.user_id
  WHERE 
    -- Only show users who have been active recently
    (s.last_active_at IS NOT NULL OR p.last_sign_in > NOW() - INTERVAL '15 minutes')
  ORDER BY
    p.id,  -- This is crucial for DISTINCT ON to work properly
    COALESCE(s.last_active_at, p.last_sign_in) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
