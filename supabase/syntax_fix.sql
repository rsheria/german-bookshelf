-- SYNTAX FIX FOR SAMPLE DATA
-- Fixes the loop syntax error and ensures get_online_users works properly

-- Make sure get_online_users is defined correctly
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

-- Make get_recent_activity is working correctly
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

-- Insert sample data with correct syntax
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- If we don't have any sessions, create some
  IF (SELECT COUNT(*) FROM public.user_sessions WHERE is_active = true) = 0 THEN
    -- Get all user IDs and loop through them
    FOR user_record IN SELECT id, username FROM public.profiles
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
        details,
        username,
        created_at
      ) VALUES 
      (
        user_record.id::text,
        'user',
        'LOGIN',
        '{}',
        user_record.username,
        NOW() - interval '20 minutes'
      ),
      (
        user_record.id::text,
        'user',
        'DOWNLOAD',
        '{}',
        user_record.username,
        NOW() - interval '10 minutes'
      ),
      (
        user_record.id::text,
        'user',
        'page_view',
        jsonb_build_object('page', '/books'),
        user_record.username,
        NOW() - interval '5 minutes'
      );
    END LOOP;
  END IF;
END;
$$;
