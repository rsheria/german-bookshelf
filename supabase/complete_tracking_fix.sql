-- COMPLETE TRACKING FIX
-- This script fixes ALL tracking functions with their correct parameters

-- First drop any old or conflicting functions to avoid signature issues
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, uuid, text, text);
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.track_page_view(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.update_user_last_active_with_ip(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.end_user_session_with_ip(uuid, uuid, text, text);

-- 1. Create update_user_last_active_with_ip exactly as trackingService.ts calls it
CREATE FUNCTION public.update_user_last_active_with_ip(
  p_user_id uuid,
  p_session_id uuid,
  p_ip_address text,
  p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update session with IP address
  INSERT INTO public.user_sessions (
    user_id,
    session_id,
    last_active_at,
    is_active,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_session_id,
    now(),
    true,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (user_id, session_id) 
  DO UPDATE SET 
    last_active_at = now(),
    is_active = true,
    ip_address = p_ip_address,
    user_agent = p_user_agent;
    
  -- Also log this activity
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    created_at
  )
  SELECT
    p_user_id::text,
    'user',
    'active',
    p_ip_address,
    username,
    NOW()
  FROM
    public.profiles
  WHERE
    id = p_user_id;
END;
$$;

-- 2. Create track_page_view_with_ip with EXACT parameter match
CREATE FUNCTION public.track_page_view_with_ip(
  p_user_id uuid,
  p_page_path text,
  p_session_id uuid,
  p_ip_address text,
  p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
BEGIN
  -- Get username for the user
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = p_user_id;

  -- Insert activity log
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    ip_address,
    created_at,
    username
  ) VALUES (
    p_user_id::text,
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    p_ip_address,
    NOW(),
    v_username
  );
  
  -- Also update last active timestamp
  UPDATE public.user_sessions
  SET 
    last_active_at = NOW(), 
    is_active = true,
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE 
    user_id = p_user_id AND 
    session_id = p_session_id;
END;
$$;

-- 3. Create track_page_view as fallback
CREATE FUNCTION public.track_page_view(
  p_user_id uuid,
  p_page_path text,
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
BEGIN
  -- Get username for the user
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = p_user_id;

  -- Insert activity log
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    created_at,
    username
  ) VALUES (
    p_user_id::text,
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    NOW(),
    v_username
  );
  
  -- Also update last active timestamp
  UPDATE public.user_sessions
  SET last_active_at = NOW(), is_active = true
  WHERE user_id = p_user_id AND session_id = p_session_id;
END;
$$;

-- 4. Create end_user_session_with_ip
CREATE FUNCTION public.end_user_session_with_ip(
  p_user_id uuid,
  p_session_id uuid,
  p_ip_address text,
  p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update session status
  UPDATE public.user_sessions
  SET
    is_active = false,
    ended_at = now(),
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE
    user_id = p_user_id AND
    session_id = p_session_id;
    
  -- Log the logout action
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    created_at
  )
  SELECT
    p_user_id::text,
    'user',
    'LOGOUT',
    p_ip_address,
    username,
    NOW()
  FROM
    public.profiles
  WHERE
    id = p_user_id;
END;
$$;

-- 5. Make sure get_online_users is defined correctly
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

-- 6. Make get_recent_activity is working correctly
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count integer DEFAULT 10)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.activity_logs
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;

-- 7. Create get_activity_stats
CREATE OR REPLACE FUNCTION public.get_activity_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_count integer;
  week_count integer;
  month_count integer;
  action_counts json;
BEGIN
  -- Get today's activity count
  SELECT COUNT(*) INTO today_count
  FROM public.activity_logs
  WHERE created_at >= (CURRENT_DATE);
  
  -- Get week's activity count
  SELECT COUNT(*) INTO week_count
  FROM public.activity_logs
  WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days');
  
  -- Get month's activity count
  SELECT COUNT(*) INTO month_count
  FROM public.activity_logs
  WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');
  
  -- Get count by action
  SELECT 
    json_object_agg(action, count)
  INTO action_counts
  FROM (
    SELECT action, COUNT(*) as count
    FROM public.activity_logs
    GROUP BY action
  ) action_counts;
  
  -- Return all stats as JSON
  RETURN json_build_object(
    'today', today_count,
    'week', week_count,
    'month', month_count,
    'byAction', COALESCE(action_counts, '{}'::json)
  );
END;
$$;

-- 8. Finally, create some samples if needed
DO $$
BEGIN
  -- If we don't have any sessions, create some
  IF (SELECT COUNT(*) FROM public.user_sessions WHERE is_active = true) = 0 THEN
    -- Get all user IDs
    FOR user_record IN (SELECT id, username FROM public.profiles)
    LOOP
      -- Create a session for each user
      INSERT INTO public.user_sessions (
        user_id,
        session_id,
        ip_address,
        user_agent,
        last_active_at,
        is_active
      ) VALUES (
        user_record.id,
        uuid_generate_v4(),
        '127.0.0.1',
        'Mozilla/5.0',
        NOW(),
        true
      ) ON CONFLICT DO NOTHING;
      
      -- Create some sample activities
      INSERT INTO public.activity_logs (
        entity_id,
        entity_type,
        action,
        username,
        created_at
      ) VALUES 
      (
        user_record.id,
        'user',
        'LOGIN',
        user_record.username,
        NOW() - interval '20 minutes'
      ),
      (
        user_record.id,
        'user',
        'DOWNLOAD',
        user_record.username,
        NOW() - interval '10 minutes'
      ),
      (
        user_record.id,
        'user',
        'page_view',
        user_record.username,
        NOW() - interval '5 minutes'
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;
