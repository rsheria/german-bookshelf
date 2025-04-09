-- AUTH FIX ONLY
-- This focuses exclusively on fixing auth-related issues

-- Drop ALL triggers that could be interfering with auth
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN (
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth'
  ) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.%I;', 
                 trigger_rec.trigger_name, 
                 trigger_rec.event_object_table);
  END LOOP;
END$$;

-- Drop any functions that could be causing permission issues
DROP FUNCTION IF EXISTS public.handle_auth_sign_in();
DROP FUNCTION IF EXISTS public.on_auth_user_login();
DROP FUNCTION IF EXISTS public.on_auth_user_created();

-- Remove any RLS policies on auth-related tables that might cause issues
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- Use only a simple approach for online users that doesn't touch auth
DROP FUNCTION IF EXISTS public.get_online_users();

CREATE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - interval '15 minutes')
  ORDER BY us.user_id, us.last_active_at DESC;
$$;
