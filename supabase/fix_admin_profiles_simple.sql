-- SIMPLER FIX FOR ADMIN PROFILES FUNCTION
-- Using only essential columns that we know exist in your database

BEGIN;

-- Drop any existing admin_get_profiles functions
DO $$
BEGIN
  BEGIN
    DROP FUNCTION IF EXISTS public.admin_get_profiles;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Function drop failed: %', SQLERRM;
  END;
END $$;

-- Create the function with only the essential columns
CREATE FUNCTION public.admin_get_profiles(
  search_term text DEFAULT NULL,
  role_filter text DEFAULT NULL,
  date_from timestamp DEFAULT NULL,
  date_to timestamp DEFAULT NULL,
  page_from integer DEFAULT 0,
  page_to integer DEFAULT 9,
  sort_order text DEFAULT 'desc'
)
RETURNS TABLE (
  id uuid,
  username text,
  is_admin boolean,
  created_at timestamp with time zone,
  last_active timestamp with time zone,
  daily_quota integer,
  monthly_request_quota integer,
  avatar_url text,
  email text,
  count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.is_admin,
    p.created_at,
    p.last_active,
    p.daily_quota,
    p.monthly_request_quota,
    p.avatar_url,
    u.email,
    count(*) OVER() as count
  FROM profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE
    (search_term IS NULL OR 
     p.username ILIKE '%' || search_term || '%' OR 
     u.email ILIKE '%' || search_term || '%')
    AND
    (role_filter IS NULL OR 
     (role_filter = 'admin' AND p.is_admin = true) OR
     (role_filter = 'user' AND p.is_admin = false))
    AND
    (date_from IS NULL OR p.created_at >= date_from)
    AND
    (date_to IS NULL OR p.created_at <= date_to)
  ORDER BY 
    CASE WHEN sort_order = 'desc' THEN p.created_at END DESC,
    CASE WHEN sort_order = 'asc' THEN p.created_at END ASC
  LIMIT (page_to - page_from + 1)
  OFFSET page_from;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.admin_get_profiles TO authenticated;

COMMIT;
