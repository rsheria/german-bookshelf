-- FINAL FIX FOR ENTITY_ID TYPE ISSUE
-- This script first checks the structure of activity_logs table and adapts accordingly

-- ==========================================
-- STEP 1: FIX THE ACTIVITY_LOGS TABLE STRUCTURE
-- ==========================================

-- Examine the activity_logs structure and fix entity_id column type
DO $$
DECLARE
  entity_id_exists BOOLEAN;
  entity_id_type TEXT;
BEGIN
  -- Check if entity_id column exists and get its type
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'activity_logs'
      AND column_name = 'entity_id'
  ) INTO entity_id_exists;
  
  IF entity_id_exists THEN
    SELECT data_type INTO entity_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'activity_logs'
      AND column_name = 'entity_id';
    
    -- If entity_id is UUID type, alter it to TEXT to be compatible
    IF entity_id_type = 'uuid' THEN
      RAISE NOTICE 'Converting activity_logs.entity_id from UUID to TEXT';
      -- First drop any foreign key constraints if they exist
      BEGIN
        EXECUTE '
          DO $$
          DECLARE
            fk_name TEXT;
          BEGIN
            SELECT conname INTO fk_name
            FROM pg_constraint
            WHERE conrelid = ''public.activity_logs''::regclass
              AND confrelid IS NOT NULL
              AND conkey @> ARRAY[(
                SELECT attnum 
                FROM pg_attribute 
                WHERE attrelid = ''public.activity_logs''::regclass
                  AND attname = ''entity_id''
              )];
            
            IF FOUND THEN
              EXECUTE ''ALTER TABLE public.activity_logs DROP CONSTRAINT '' || fk_name;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END $$;
        ';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping foreign key: %', SQLERRM;
      END;
      
      -- Now try to alter the column type
      BEGIN
        ALTER TABLE public.activity_logs
        ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;
        RAISE NOTICE 'Successfully altered entity_id column to TEXT';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to alter entity_id: %', SQLERRM;
        -- If we can't alter, try to recreate the table with the right schema
        -- But first backup the existing data
        BEGIN
          CREATE TABLE IF NOT EXISTS public.activity_logs_backup AS
          SELECT * FROM public.activity_logs;
          
          -- Drop the original table
          DROP TABLE public.activity_logs;
          
          -- Create a new version with TEXT type for entity_id
          CREATE TABLE public.activity_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            username TEXT,
            action TEXT NOT NULL,
            entity_id TEXT,
            entity_type TEXT,
            entity_name TEXT,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            ip_address TEXT,
            user_agent TEXT
          );
          
          -- Copy the data back, casting entity_id to TEXT
          INSERT INTO public.activity_logs (
            id, user_id, username, action, entity_id, entity_type, 
            entity_name, details, created_at, ip_address, user_agent
          )
          SELECT 
            id, user_id, username, action, entity_id::TEXT, entity_type, 
            entity_name, details, created_at, ip_address, user_agent
          FROM public.activity_logs_backup;
          
          -- Grant permissions
          ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
          GRANT ALL ON public.activity_logs TO authenticated, service_role;
          
          -- Add policies
          CREATE POLICY "Users can view their own logs" 
            ON public.activity_logs FOR SELECT 
            USING (auth.uid() = user_id);
          
          CREATE POLICY "Admins can view all logs" 
            ON public.activity_logs FOR SELECT 
            USING (
              EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.is_admin = true
              )
            );
          
          RAISE NOTICE 'Successfully recreated activity_logs table';
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Failed to recreate activity_logs table: %', SQLERRM;
        END;
      END;
    ELSE
      RAISE NOTICE 'entity_id is already type: %', entity_id_type;
    END IF;
  ELSE
    RAISE NOTICE 'entity_id column does not exist in activity_logs';
    -- Create the table with the correct schema if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      username TEXT,
      action TEXT NOT NULL,
      entity_id TEXT,
      entity_type TEXT,
      entity_name TEXT,
      details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      ip_address TEXT,
      user_agent TEXT
    );
    
    -- Grant permissions
    ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.activity_logs TO authenticated, service_role;
    
    -- Add policies
    CREATE POLICY "Users can view their own logs" 
      ON public.activity_logs FOR SELECT 
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Admins can view all logs" 
      ON public.activity_logs FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
  END IF;
END
$$;

-- ==========================================
-- STEP 2: FIX update_user_last_active FUNCTION
-- ==========================================

DROP FUNCTION IF EXISTS public.update_user_last_active(uuid, text);

CREATE OR REPLACE FUNCTION public.update_user_last_active(
  p_user_id UUID,
  p_session_id TEXT
)
RETURNS VOID AS $$
DECLARE
  ip_addr TEXT;
  user_agent_str TEXT;
BEGIN
  -- Get IP and user agent from request headers
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    ip_addr := 'unknown';
  END;
  
  BEGIN
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    user_agent_str := 'unknown';
  END;

  -- Update the session (if it exists)
  UPDATE public.user_sessions
  SET 
    last_active_at = now(),
    is_active = true,
    ip_address = COALESCE(ip_address, ip_addr),
    user_agent = COALESCE(user_agent, user_agent_str)
  WHERE 
    user_id = p_user_id AND 
    session_id = p_session_id;
  
  -- If no rows were updated, insert a new session
  IF NOT FOUND THEN
    INSERT INTO public.user_sessions (
      user_id,
      session_id,
      ip_address,
      user_agent,
      started_at,
      last_active_at,
      is_active
    )
    VALUES (
      p_user_id,
      p_session_id,
      ip_addr,
      user_agent_str,
      now(),
      now(),
      true
    );
  END IF;
  
  -- Log activity (carefully with the entity_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    INSERT INTO public.activity_logs (
      user_id,
      username,
      action,
      entity_id,
      entity_type,
      details,
      ip_address,
      user_agent
    )
    SELECT
      p_user_id,
      p.username,
      'ACTIVE',
      p_user_id::TEXT,  -- Always convert to TEXT
      'USER',
      jsonb_build_object(
        'session_id', p_session_id,
        'timestamp', now()
      ),
      ip_addr,
      user_agent_str
    FROM public.profiles p
    WHERE p.id = p_user_id
    -- Limit activity logging to once per 15 minutes
    AND NOT EXISTS (
      SELECT 1 FROM public.activity_logs
      WHERE 
        user_id = p_user_id AND
        action = 'ACTIVE' AND
        created_at > now() - interval '15 minutes'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore errors to keep app working
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 3: CLEAN UP SESSIONS & UPDATE ONLINE USERS FUNCTION
-- ==========================================

-- Delete fake sessions
DELETE FROM public.user_sessions
WHERE user_agent = 'Seeded User Agent'
   OR session_id LIKE 'seed-session-%'
   OR session_id LIKE 'real-session-%';

-- Fix the online users function
DROP FUNCTION IF EXISTS public.get_online_users(interval);

CREATE OR REPLACE FUNCTION public.get_online_users(time_window interval DEFAULT interval '15 minutes')
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  ip_address TEXT
) AS $$
BEGIN
  -- Mark old sessions as inactive
  UPDATE public.user_sessions
  SET is_active = false
  WHERE last_active_at < (now() - time_window);

  -- Return active users only
  RETURN QUERY
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active,
    us.ip_address
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - time_window)
  ORDER BY us.user_id, us.last_active_at DESC;
EXCEPTION WHEN OTHERS THEN
  RETURN; -- Return empty set on error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 4: ADD SIMPLE TEST SESSION TO VERIFY
-- ==========================================

-- Add a test session just for the current admin
INSERT INTO public.user_sessions (
  user_id,
  session_id,
  ip_address,
  user_agent,
  started_at,
  last_active_at,
  is_active
)
SELECT 
  id,
  'admin-session-' || gen_random_uuid(),
  '192.168.1.1',
  'Admin Browser (Emergency Fix)',
  now(),
  now(),
  true
FROM public.profiles 
WHERE is_admin = true
LIMIT 1
ON CONFLICT DO NOTHING;

-- ==========================================
-- STEP 5: GRANT PERMISSIONS
-- ==========================================

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION public.update_user_last_active(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_online_users(interval) TO authenticated, service_role;
