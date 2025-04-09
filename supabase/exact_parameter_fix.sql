-- EXACT PARAMETER FIX
-- Creates functions with EXACTLY the parameter names and order used by the frontend

-- 1. get_user_activity - this is critical and causing the 404 error
DROP FUNCTION IF EXISTS public.get_user_activity(integer, uuid);
DROP FUNCTION IF EXISTS public.get_user_activity(integer, integer, uuid);

CREATE FUNCTION public.get_user_activity(
  limit_count integer,
  p_user_id uuid
)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.activity_logs
  WHERE entity_id = p_user_id::text
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;

-- 2. Implement get_activity_stats to match the exact call in activityService.ts
DROP FUNCTION IF EXISTS public.get_activity_stats();

CREATE FUNCTION public.get_activity_stats()
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

-- 3. log_user_activity_with_type function which is called by logUserActivity
CREATE OR REPLACE FUNCTION public.log_user_activity_with_type(
  p_user_id uuid,
  p_action text,
  p_entity_id text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_name text DEFAULT NULL,
  p_details json DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
  v_activity_id text;
BEGIN
  -- Get username
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = p_user_id;

  -- Insert the activity log
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    entity_name,
    details,
    username,
    ip_address,
    created_at
  )
  VALUES (
    COALESCE(p_entity_id, p_user_id::text),
    COALESCE(p_entity_type, 'user'),
    p_action,
    p_entity_name,
    p_details,
    v_username,
    p_ip_address,
    NOW()
  )
  RETURNING id INTO v_activity_id;
  
  -- Also update user session
  UPDATE public.user_sessions
  SET 
    last_active_at = NOW(),
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE 
    user_id = p_user_id AND
    is_active = true;
    
  RETURN v_activity_id;
END;
$$;

-- 4. Simple fallback log_user_activity function
CREATE OR REPLACE FUNCTION public.log_user_activity(
  user_id uuid,
  action text, 
  entity_id text DEFAULT NULL,
  entity_type text DEFAULT NULL,
  entity_name text DEFAULT NULL,
  details json DEFAULT NULL,
  ip_address text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
  v_activity_id text;
BEGIN
  -- Get username
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = user_id;

  -- Insert the activity log
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    entity_name,
    details,
    username,
    ip_address,
    created_at
  )
  VALUES (
    COALESCE(entity_id, user_id::text),
    COALESCE(entity_type, 'user'),
    action,
    entity_name,
    details,
    v_username,
    ip_address,
    NOW()
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- 5. Add get_user_login_history function which is called by activityService.ts
CREATE OR REPLACE FUNCTION public.get_user_login_history(limit_count integer DEFAULT 20)
RETURNS SETOF activity_logs
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.activity_logs
  WHERE action = 'LOGIN'
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;

-- 6. Make sure the track_page_view_with_ip function also logs activity
CREATE OR REPLACE FUNCTION public.track_page_view_with_ip(
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
  -- Get username
  SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;

  -- Log page view
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    ip_address,
    username,
    created_at
  ) VALUES (
    p_user_id::text,
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    p_ip_address,
    v_username,
    NOW()
  );
  
  -- Also update session
  UPDATE public.user_sessions
  SET 
    last_active_at = NOW(),
    is_active = true,
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE 
    user_id = p_user_id AND
    session_id = p_session_id;
    
  -- If no session, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      started_at,
      last_active_at,
      is_active,
      ip_address,
      user_agent
    ) VALUES (
      p_user_id,
      p_session_id,
      NOW(),
      NOW(),
      true,
      p_ip_address,
      p_user_agent
    );
  END IF;
  
  -- Log a login activity if there isn't a recent one
  IF NOT EXISTS (
    SELECT 1 FROM public.activity_logs
    WHERE 
      entity_id = p_user_id::text AND
      action = 'LOGIN' AND
      created_at > (NOW() - interval '4 hours')
  ) THEN
    INSERT INTO public.activity_logs (
      entity_id,
      entity_type,
      action,
      details,
      ip_address,
      username,
      created_at
    ) VALUES (
      p_user_id::text,
      'user',
      'LOGIN',
      jsonb_build_object('auto_generated', true),
      p_ip_address,
      v_username,
      NOW()
    );
  END IF;
END;
$$;
