-- IMPROVED IP TRACKING FUNCTIONS
-- These functions extend the existing tracking functionality with better IP address handling

-- Enhanced function to update user's last active time with IP
CREATE OR REPLACE FUNCTION public.update_user_last_active_with_ip(
  p_user_id uuid,
  p_session_id text,
  p_ip_address text,
  p_user_agent text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's last active timestamp
  UPDATE public.user_sessions 
  SET 
    last_active_at = NOW(),
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE 
    user_id = p_user_id AND 
    session_id::text = p_session_id AND
    is_active = true;
  
  -- If no sessions were updated, create a new one
  IF NOT FOUND THEN
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      ip_address,
      user_agent,
      created_at,
      last_active_at,
      is_active
    )
    VALUES (
      p_user_id,
      p_session_id::uuid,
      p_ip_address,
      p_user_agent,
      NOW(),
      NOW(),
      true
    );
  END IF;
  
  -- Record IP in the ip_logs table for tracking
  INSERT INTO public.ip_logs (
    user_id,
    ip_address,
    user_agent,
    created_at
  )
  VALUES (
    p_user_id,
    p_ip_address,
    p_user_agent,
    NOW()
  );
END;
$$;

-- Enhanced function to track page views with IP
CREATE OR REPLACE FUNCTION public.track_page_view_with_ip(
  p_user_id uuid,
  p_page_path text,
  p_session_id text,
  p_ip_address text,
  p_user_agent text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user session with the provided IP
  PERFORM public.update_user_last_active_with_ip(
    p_user_id, 
    p_session_id, 
    p_ip_address, 
    p_user_agent
  );
  
  -- Log the page view with the improved IP tracking
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    created_at,
    session_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    'user',
    'page_view',
    jsonb_build_object('page', p_page_path),
    NOW(),
    p_session_id,
    p_ip_address,
    p_user_agent
  );
END;
$$;

-- Enhanced function to end user session with IP
CREATE OR REPLACE FUNCTION public.end_user_session_with_ip(
  p_user_id uuid,
  p_session_id text,
  p_ip_address text,
  p_user_agent text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark the session as inactive
  UPDATE public.user_sessions
  SET 
    is_active = false,
    last_active_at = NOW(),
    ip_address = p_ip_address,
    user_agent = p_user_agent
  WHERE 
    user_id = p_user_id AND 
    session_id::text = p_session_id;
  
  -- Log the logout with improved IP tracking
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    created_at,
    session_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    'user',
    'logout',
    NOW(),
    p_session_id,
    p_ip_address,
    p_user_agent
  );
END;
$$;

-- Function to log actions with explicit action types
CREATE OR REPLACE FUNCTION public.log_user_activity_with_type(
  p_user_id uuid,
  p_action text,
  p_entity_id text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_name text DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
  v_log_id uuid;
BEGIN
  -- Get the username for reference
  SELECT username INTO v_username 
  FROM public.profiles 
  WHERE id = p_user_id::uuid;
  
  -- Insert the activity log with specific action type
  INSERT INTO public.activity_logs (
    entity_id,
    entity_type,
    action,
    details,
    created_at,
    session_id,
    ip_address,
    user_agent,
    username  -- Store username directly for easier querying
  )
  VALUES (
    p_user_id,
    COALESCE(p_entity_type, 'user'),
    p_action,
    p_details,
    NOW(),
    (SELECT session_id::text FROM public.user_sessions WHERE user_id = p_user_id AND is_active = true ORDER BY last_active_at DESC LIMIT 1),
    p_ip_address,
    p_user_agent,
    v_username
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create a function to get more detailed activity logs with username
CREATE OR REPLACE FUNCTION public.get_enhanced_activity_logs(
  limit_count integer DEFAULT 50,
  with_details boolean DEFAULT true
) RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  action text,
  entity_id text,
  entity_type text,
  entity_name text,
  details jsonb,
  created_at timestamptz,
  ip_address text,
  user_agent text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    al.id,
    al.entity_id::uuid as user_id,
    COALESCE(al.username, p.username) as username,
    al.action,
    al.entity_id,
    al.entity_type,
    al.entity_name,
    CASE WHEN with_details THEN al.details ELSE NULL END as details,
    al.created_at,
    al.ip_address,
    al.user_agent
  FROM 
    public.activity_logs al
  LEFT JOIN
    public.profiles p ON al.entity_id::uuid = p.id
  ORDER BY 
    al.created_at DESC
  LIMIT 
    limit_count;
$$;
