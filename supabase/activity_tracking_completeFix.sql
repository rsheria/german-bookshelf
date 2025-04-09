-- COMPLETE ACTIVITY TRACKING FIX

-- Add a function for tracking user page views and activity
CREATE OR REPLACE FUNCTION public.update_user_last_active(
  user_id_param uuid,
  url_param text DEFAULT NULL,
  ip_param text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  username_val text;
  has_session boolean;
BEGIN
  -- Get username
  SELECT username INTO username_val
  FROM profiles
  WHERE id = user_id_param;
  
  -- Update last_sign_in in profiles
  UPDATE profiles
  SET last_sign_in = NOW()
  WHERE id = user_id_param;
  
  -- Check if user has a session
  SELECT EXISTS (
    SELECT 1 FROM user_sessions 
    WHERE user_id = user_id_param
  ) INTO has_session;
  
  -- Update or create session
  IF has_session THEN
    UPDATE user_sessions
    SET last_active_at = NOW(),
        is_active = true,
        ip_address = COALESCE(ip_param, ip_address)
    WHERE user_id = user_id_param;
  ELSE
    -- Create new session
    INSERT INTO user_sessions (
      user_id,
      session_id,
      started_at,
      last_active_at,
      is_active,
      ip_address
    ) VALUES (
      user_id_param,
      gen_random_uuid(),
      NOW(),
      NOW(),
      true,
      COALESCE(ip_param, '0.0.0.0')
    );
  END IF;
  
  -- If URL provided, log page view
  IF url_param IS NOT NULL THEN
    INSERT INTO activity_logs (
      entity_id,
      entity_type,
      action,
      ip_address,
      username,
      details,
      created_at
    ) VALUES (
      user_id_param::text,
      'user',
      'page_view',
      COALESCE(ip_param, '0.0.0.0'),
      username_val,
      jsonb_build_object('url', url_param),
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
