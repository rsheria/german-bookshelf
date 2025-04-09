-- SIMPLE FIX FOR TRACKING FUNCTIONALITY
-- This script makes minimal changes to restore the previous working functionality

-- 1. Ensure username column exists in activity_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.activity_logs ADD COLUMN username text;
    
    -- Update existing records with usernames
    UPDATE public.activity_logs al
    SET username = p.username
    FROM public.profiles p
    WHERE al.entity_id::uuid = p.id AND al.username IS NULL;
  END IF;
END
$$;

-- 2. Create a simple trigger to automatically set username on insert
CREATE OR REPLACE FUNCTION public.set_activity_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If username is not already set, get it from profiles
  IF NEW.username IS NULL AND NEW.entity_type = 'user' THEN
    SELECT username INTO NEW.username
    FROM public.profiles
    WHERE id = NEW.entity_id::uuid;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS set_activity_username_trigger ON public.activity_logs;
CREATE TRIGGER set_activity_username_trigger
BEFORE INSERT ON public.activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_activity_username();

-- 3. Make sure get_online_users function is restored exactly as it was originally
CREATE OR REPLACE FUNCTION public.get_online_users()
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
