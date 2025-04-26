-- COMPLETE SOLUTION - This is the ONLY SQL you need to run
-- No need to modify the frontend - just run this SQL

BEGIN;

-- Clear the function to start fresh
DROP FUNCTION IF EXISTS public.admin_get_profiles(text, text, timestamp without time zone, timestamp without time zone, integer, integer, text);
DROP FUNCTION IF EXISTS public.admin_get_profiles(text, text, timestamp with time zone, timestamp with time zone, integer, integer, text);
DROP FUNCTION IF EXISTS public.admin_get_profiles;

-- Create view that includes all needed user data including last_active
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  p.id,
  p.username,
  p.is_admin,
  p.created_at,
  p.daily_quota,
  p.monthly_request_quota,
  p.last_active,
  p.avatar_url,
  p.subscription_plan,
  p.referrals_count,
  p.referral_code,
  u.email
FROM 
  public.profiles p
LEFT JOIN 
  auth.users u ON p.id = u.id;

-- Create a simple function that just returns data from the view
CREATE OR REPLACE FUNCTION public.admin_get_profiles(
  search_term text DEFAULT NULL,
  role_filter text DEFAULT NULL,
  date_from timestamp DEFAULT NULL,
  date_to timestamp DEFAULT NULL,
  page_from integer DEFAULT 0,
  page_to integer DEFAULT 9,
  sort_order text DEFAULT 'desc'
)
RETURNS SETOF public.admin_users_view
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count bigint;
BEGIN
  -- First, get the total count for the count column
  SELECT count(*) INTO total_count FROM admin_users_view p
  WHERE
    (search_term IS NULL OR 
     p.username ILIKE '%' || search_term || '%' OR 
     p.email ILIKE '%' || search_term || '%')
    AND
    (role_filter IS NULL OR 
     (role_filter = 'admin' AND p.is_admin = true) OR
     (role_filter = 'user' AND p.is_admin = false))
    AND
    (date_from IS NULL OR p.created_at >= date_from)
    AND
    (date_to IS NULL OR p.created_at <= date_to);

  -- Then return the actual results with the count
  RETURN QUERY
  SELECT 
    p.*
  FROM admin_users_view p
  WHERE
    (search_term IS NULL OR 
     p.username ILIKE '%' || search_term || '%' OR 
     p.email ILIKE '%' || search_term || '%')
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
