-- CAST FIX FOR ADMIN PROFILES
-- With explicit type casting to avoid data type mismatches

BEGIN;

-- First, completely drop the function
DO $$
DECLARE
  _sql text;
BEGIN
  SELECT 'DROP FUNCTION IF EXISTS ' || oid::regprocedure
  FROM pg_proc
  WHERE proname = 'admin_get_profiles'
  AND pg_function_is_visible(oid)
  INTO _sql;
  
  IF _sql IS NOT NULL THEN
    EXECUTE _sql;
  END IF;
END $$;

-- Create a simple function to get just last_active for all users in profiles
CREATE OR REPLACE FUNCTION public.get_all_user_activities()
RETURNS TABLE (
  user_id uuid,
  last_active timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, last_active FROM profiles;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_all_user_activities TO authenticated;

COMMIT;
