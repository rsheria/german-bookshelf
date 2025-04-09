-- Fix function overload issues by creating uniquely named functions

-- First, let's drop all conflicting functions
DROP FUNCTION IF EXISTS public.get_user_activity(uuid, integer);
DROP FUNCTION IF EXISTS public.get_user_activity(integer, uuid);

-- Create a new function with a unique name
CREATE OR REPLACE FUNCTION public.get_user_activities(user_id_param uuid, limit_param integer DEFAULT 50)
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
    a.entity_id = user_id_param::text
    AND a.entity_type = 'user'
  ORDER BY
    a.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
