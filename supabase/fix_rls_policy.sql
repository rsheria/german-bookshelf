-- FIX RLS POLICY FOR IP_LOGS TABLE
-- This allows proper IP tracking by fixing the security policies

-- First, drop any existing policies on the ip_logs table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.ip_logs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.ip_logs;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ip_logs;

-- Create a permissive policy that allows authenticated users to insert and view their own records
CREATE POLICY "Enable CRUD for authenticated users" ON public.ip_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true))
  WITH CHECK (true);

-- Create a function that bypasses RLS for the ip tracking system
CREATE OR REPLACE FUNCTION public.bypass_rls_record_ip(
  user_id_param uuid,
  ip_address_param text,
  user_agent_param text DEFAULT 'System Tracking'
)
RETURNS void AS $$
BEGIN
  -- Insert directly using security definer privileges
  INSERT INTO public.ip_logs (
    user_id,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    user_id_param,
    COALESCE(ip_address_param, '0.0.0.0'),
    user_agent_param,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the activity tracker to use the bypass function
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
  
  -- Record IP using the bypass function
  PERFORM bypass_rls_record_ip(user_id_param, ip_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
