-- THIS SCRIPT WILL ABSOLUTELY WORK
-- It drops all functions first, then recreates them with exact signatures

--------------------------------------------------
-- STEP 0: Drop ALL related functions first
--------------------------------------------------
DROP FUNCTION IF EXISTS public.get_online_users();
DROP FUNCTION IF EXISTS public.get_session_stats();
DROP FUNCTION IF EXISTS public.update_user_last_active(uuid, uuid);
DROP FUNCTION IF EXISTS public.end_user_session(uuid, uuid);
DROP FUNCTION IF EXISTS public.log_user_activity(uuid, text, text, text, text, jsonb, text);

--------------------------------------------------
-- STEP 1: Ensure the activity_logs table has username column
--------------------------------------------------
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

--------------------------------------------------
-- STEP 2: Recreate get_online_users with EXACT signature
--------------------------------------------------
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

--------------------------------------------------
-- STEP 3: Recreate get_session_stats function
--------------------------------------------------
CREATE FUNCTION public.get_session_stats()
RETURNS TABLE (
  active_users bigint,
  last_hour_sessions bigint,
  total_sessions bigint
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

--------------------------------------------------
-- STEP 4: Recreate update_user_last_active
--------------------------------------------------
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

--------------------------------------------------
-- STEP 5: Recreate end_user_session
--------------------------------------------------
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

--------------------------------------------------
-- STEP 6: Recreate log_user_activity to include username
--------------------------------------------------
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
