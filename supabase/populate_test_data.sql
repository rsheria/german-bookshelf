-- POPULATE TEST DATA
-- This script adds real test data to ensure tracking is displayed

-- 1. Get your user ID (and other users if available)
DO $$
DECLARE
  curr_user_id uuid;
  curr_username text;
  session_id uuid;
  session_exists boolean;
BEGIN
  -- Get a list of user IDs from profiles
  FOR curr_user_id, curr_username IN 
    SELECT id, username FROM public.profiles LIMIT 5
  LOOP
    -- Generate a new session ID
    session_id := uuid_generate_v4();
    
    -- Check if user already has any sessions
    SELECT EXISTS(
      SELECT 1 FROM public.user_sessions 
      WHERE user_id = curr_user_id
    ) INTO session_exists;
    
    -- If session exists, update it, otherwise create new one
    IF session_exists THEN
      UPDATE public.user_sessions
      SET last_active_at = NOW(),
          is_active = true
      WHERE user_id = curr_user_id;
    ELSE
      -- Create an active session for each user
      INSERT INTO public.user_sessions (
        user_id,
        session_id,
        started_at,
        last_active_at,
        is_active,
        ip_address,
        user_agent
      ) VALUES (
        curr_user_id,
        session_id,
        NOW() - interval '10 minutes',
        NOW(), -- Make it very recent
        true,  -- Active session
        '192.168.1.' || (FLOOR(RANDOM() * 255))::text, -- Random IP
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
      );
    END IF;
    
    -- Add login activity
    INSERT INTO public.activity_logs (
      entity_id,
      entity_type,
      action,
      details,
      ip_address,
      username,
      created_at
    ) VALUES (
      curr_user_id::text,
      'user',
      'LOGIN',
      '{"source": "sample_data"}',
      '192.168.1.' || (FLOOR(RANDOM() * 255))::text,
      curr_username,
      NOW() - interval '10 minutes'
    );
    
    -- Also add some page views
    INSERT INTO public.activity_logs (
      entity_id,
      entity_type,
      action,
      details,
      ip_address,
      username,
      created_at
    ) VALUES (
      curr_user_id::text,
      'user',
      'page_view',
      '{"page": "/books"}',
      '192.168.1.' || (FLOOR(RANDOM() * 255))::text,
      curr_username,
      NOW() - interval '5 minutes'
    );
    
    -- Update last_sign_in in profiles
    UPDATE public.profiles
    SET last_sign_in = NOW() - interval '10 minutes'
    WHERE id = curr_user_id;
  END LOOP;
END $$;
