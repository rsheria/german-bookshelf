-- DEFINITIVE SOLUTION FOR GERMAN BOOKSHELF TRACKING
-- This script EXACTLY matches your existing code interface for perfect compatibility
-- Carefully constructed to ensure all functions have the EXACT signatures expected by your TypeScript interfaces

-- Step 1: First drop any dependent triggers
DROP TRIGGER IF EXISTS set_activity_username_trigger ON public.activity_logs;

-- Step 2: Drop all the functions with exact parameter signatures to avoid conflicts
DROP FUNCTION IF EXISTS public.get_online_users();
DROP FUNCTION IF EXISTS public.get_session_stats();
DROP FUNCTION IF EXISTS public.update_user_last_active(uuid, uuid);
DROP FUNCTION IF EXISTS public.end_user_session(uuid, uuid);
DROP FUNCTION IF EXISTS public.log_user_activity(uuid, text, text, text, text, jsonb, text);

-- Step 3: Add username column to activity_logs if it doesn't exist
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

-- Step 4: Create get_online_users with EXACT SIGNATURE matching OnlineUser interface
CREATE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,         -- Must be uuid, not text or string
  username text,        -- Must be text 
  last_active timestamptz  -- Must be timestamptz to match interface
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

-- Step 5: Create get_session_stats with EXACT SIGNATURE matching the return type in onlineUserService.ts
CREATE FUNCTION public.get_session_stats()
RETURNS TABLE (
  active_users bigint,       -- First field must be active_users
  last_hour_sessions bigint, -- Second field must be last_hour_sessions
  total_sessions bigint      -- Third field must be total_sessions
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM public.user_sessions 
     WHERE is_active = true) as active_users,
    (SELECT COUNT(*) FROM public.user_sessions 
     WHERE last_active_at >= NOW() - interval '1 hour') as last_hour_sessions,
    (SELECT COUNT(*) FROM public.user_sessions) as total_sessions;
$$;

-- Step 6: Create update_user_last_active with EXACT SIGNATURE
CREATE FUNCTION public.update_user_last_active(
  user_id uuid,
  session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update session record
  INSERT INTO public.user_sessions (
    user_id,
    session_id,
    last_active_at,
    is_active
  )
  VALUES (
    user_id,
    session_id,
    now(),
    true
  )
  ON CONFLICT (user_id, session_id) 
  DO UPDATE SET 
    last_active_at = now(),
    is_active = true;
END;
$$;

-- Step 7: Create end_user_session with EXACT SIGNATURE
CREATE FUNCTION public.end_user_session(
  user_id uuid,
  session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_sessions
  SET
    is_active = false,
    ended_at = now()
  WHERE
    user_id = $1 AND
    session_id = $2;
END;
$$;

-- Step 8: Create improved log_user_activity that extracts username
CREATE FUNCTION public.log_user_activity(
  user_id uuid,
  action text,
  entity_id text DEFAULT NULL,
  entity_type text DEFAULT 'user',
  entity_name text DEFAULT NULL,
  details jsonb DEFAULT NULL,
  ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
  v_log_id uuid;
BEGIN
  -- Get username for the activity
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = user_id;
  
  -- Insert activity log
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    entity_name,
    details,
    created_at,
    ip_address,
    username
  )
  VALUES (
    user_id,
    entity_type,
    action,
    entity_name,
    details,
    NOW(),
    ip_address,
    v_username
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Step 9: Create a lightweight trigger to ensure usernames are always populated
CREATE FUNCTION public.ensure_activity_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update username if it's NULL and we have a valid user ID
  IF NEW.username IS NULL AND 
     NEW.entity_type = 'user' AND 
     NEW.entity_id IS NOT NULL THEN
    
    SELECT username INTO NEW.username
    FROM public.profiles
    WHERE id = NEW.entity_id::uuid;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically populate username
CREATE TRIGGER ensure_activity_username_trigger
BEFORE INSERT ON public.activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.ensure_activity_username();
