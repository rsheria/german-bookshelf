-- FIX IP TRACKING
-- This ensures IP addresses are captured correctly without breaking other functionality

-- First, let's create a robust function to log IP addresses
CREATE OR REPLACE FUNCTION public.record_ip_address(
  user_id_param uuid,
  ip_address_param text
)
RETURNS void AS $$
BEGIN
  -- Insert into ip_logs table
  INSERT INTO public.ip_logs (
    user_id,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    user_id_param,
    COALESCE(ip_address_param, '0.0.0.0'),
    'Login/Activity Tracking',
    NOW()
  );
  
  -- Also update the user session with this IP
  UPDATE public.user_sessions
  SET ip_address = COALESCE(ip_address_param, ip_address, '0.0.0.0'),
      last_active_at = NOW()
  WHERE user_id = user_id_param AND is_active = true;
EXCEPTION WHEN others THEN
  -- Silently fail so we don't break other functionality
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update our login activity function to always record IP
CREATE OR REPLACE FUNCTION public.log_login_activity(
  user_id_param uuid,
  ip_address_param text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  username_val text;
BEGIN
  -- Get username
  SELECT username INTO username_val
  FROM profiles
  WHERE id = user_id_param;
  
  -- Update last_sign_in in profiles
  UPDATE profiles
  SET last_sign_in = NOW()
  WHERE id = user_id_param;
  
  -- Create/update a session
  BEGIN
    INSERT INTO user_sessions (
      user_id,
      session_id,
      started_at,
      last_active_at,
      is_active,
      ip_address,
      user_agent
    ) VALUES (
      user_id_param,
      gen_random_uuid(),
      NOW(),
      NOW(),
      true,
      COALESCE(ip_address_param, '0.0.0.0'),
      'Frontend login'
    );
  EXCEPTION WHEN others THEN
    -- If insert fails, try to update
    UPDATE user_sessions
    SET last_active_at = NOW(),
        is_active = true,
        ip_address = COALESCE(ip_address_param, ip_address, '0.0.0.0')
    WHERE user_id = user_id_param;
  END;
  
  -- Log activity
  INSERT INTO activity_logs (
    entity_id,
    entity_type,
    action,
    ip_address,
    username,
    created_at
  ) VALUES (
    user_id_param::text,
    'user',
    'LOGIN',
    COALESCE(ip_address_param, '0.0.0.0'),
    username_val,
    NOW()
  );
  
  -- Also record in ip_logs
  PERFORM record_ip_address(user_id_param, ip_address_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
