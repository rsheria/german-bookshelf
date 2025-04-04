-- This SQL script implements all necessary components for user activity tracking
-- including the activity_logs table, functions for logging activity, and views for statistics

-- 1. First, check if activity_logs table exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
    -- Create the activity_logs table if it doesn't exist
    CREATE TABLE public.activity_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_id UUID,
      entity_type TEXT,
      entity_name TEXT,
      details JSONB,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    -- Grant appropriate permissions on the activity_logs table
    ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

    -- Create policy to allow authenticated users to insert their own activity logs
    CREATE POLICY insert_own_activity ON public.activity_logs 
      FOR INSERT TO authenticated 
      WITH CHECK (auth.uid() = user_id);

    -- Create policy to allow users to view their own activity logs
    CREATE POLICY select_own_activity ON public.activity_logs 
      FOR SELECT TO authenticated 
      USING (auth.uid() = user_id);

    -- Create policy to allow admins to view all activity logs
    CREATE POLICY admin_select_all_activity ON public.activity_logs 
      FOR SELECT TO authenticated 
      USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
  END IF;
END
$$;

-- 2. Check if log_user_activity function exists and skip creating it if it does
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'log_user_activity' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Create the function to log user activity
    EXECUTE '
    CREATE FUNCTION public.log_user_activity(
      user_id UUID,
      action TEXT,
      entity_id UUID DEFAULT NULL,
      entity_type TEXT DEFAULT NULL,
      entity_name TEXT DEFAULT NULL,
      details JSONB DEFAULT NULL,
      ip_address TEXT DEFAULT NULL
    ) RETURNS UUID
    LANGUAGE plpgsql SECURITY DEFINER
    AS $func$
    DECLARE
      username_val TEXT;
      activity_id UUID;
    BEGIN
      -- Get the username from profiles table
      SELECT username INTO username_val FROM public.profiles WHERE id = user_id;
      
      -- If we couldn''t find a username, use the user_id as fallback
      IF username_val IS NULL THEN
        username_val := user_id::TEXT;
      END IF;
      
      -- Insert the activity record and get the ID
      INSERT INTO public.activity_logs (
        user_id, 
        username, 
        action, 
        entity_id, 
        entity_type, 
        entity_name, 
        details, 
        ip_address
      )
      VALUES (
        user_id, 
        username_val, 
        action, 
        entity_id, 
        entity_type, 
        entity_name, 
        details, 
        ip_address
      )
      RETURNING id INTO activity_id;
      
      RETURN activity_id;
    END;
    $func$';
  END IF;
END
$$;

-- 3. Create a function to get activity counts by action type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'get_activity_count_by_action' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    EXECUTE '
    CREATE FUNCTION public.get_activity_count_by_action()
    RETURNS TABLE (action TEXT, count BIGINT)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT 
        activity_logs.action,
        COUNT(*)::BIGINT as count
      FROM 
        public.activity_logs
      GROUP BY 
        activity_logs.action
      ORDER BY 
        count DESC;
    END;
    $func$';
  END IF;
END
$$;

-- 4. Create or replace login trigger with error handling
CREATE OR REPLACE FUNCTION public.on_auth_user_login()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Don't insert if there's an error in the transaction
  BEGIN
    PERFORM public.log_user_activity(
      auth.uid(),
      'LOGIN',
      NULL,
      'auth',
      NEW.email,
      jsonb_build_object('system', current_setting('application_name', true)),
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the login
    RAISE NOTICE 'Error logging login activity: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Update the trigger if it already exists
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.on_auth_user_login();

-- 5. Create helper functions for statistics

-- Function to get the count of active users (logged in within the last 30 days)
CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  active_count BIGINT;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO active_count
  FROM public.activity_logs
  WHERE action = 'LOGIN'
  AND created_at >= NOW() - INTERVAL '30 days';
  
  RETURN active_count;
END;
$$;

-- Function to get new users count by time period
CREATE OR REPLACE FUNCTION public.get_new_users_count(period TEXT)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
  period_start TIMESTAMPTZ;
BEGIN
  CASE period
    WHEN 'today' THEN
      period_start := DATE_TRUNC('day', NOW());
    WHEN 'week' THEN
      period_start := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
    WHEN 'month' THEN
      period_start := DATE_TRUNC('day', NOW() - INTERVAL '30 days');
    ELSE
      period_start := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
  END CASE;
  
  SELECT COUNT(*) INTO new_count
  FROM public.profiles
  WHERE created_at >= period_start;
  
  RETURN new_count;
END;
$$;

-- 6. Create or replace download trigger function with proper error handling
CREATE OR REPLACE FUNCTION public.log_download_activity()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  book_title TEXT;
BEGIN
  -- Get the book title
  SELECT title INTO book_title 
  FROM public.books 
  WHERE id = NEW.book_id;
  
  -- Don't insert if there's an error
  BEGIN
    PERFORM public.log_user_activity(
      NEW.user_id,
      'DOWNLOAD',
      NEW.book_id,
      'book',
      book_title,
      jsonb_build_object('format', NEW.format),
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the download
    RAISE NOTICE 'Error logging download activity: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for downloads if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'downloads') THEN
    DROP TRIGGER IF EXISTS on_download_insert ON public.downloads;
    CREATE TRIGGER on_download_insert
      AFTER INSERT ON public.downloads
      FOR EACH ROW
      EXECUTE FUNCTION public.log_download_activity();
  END IF;
END
$$;

-- 7. Create a view for recent user activity statistics
CREATE OR REPLACE VIEW public.user_activity_stats AS
SELECT
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE is_admin = true) as admin_users,
  (SELECT public.get_active_users_count()) as active_users,
  (SELECT public.get_new_users_count('today')) as new_users_today,
  (SELECT public.get_new_users_count('week')) as new_users_this_week,
  (SELECT public.get_new_users_count('month')) as new_users_this_month,
  (SELECT AVG(daily_quota) FROM public.profiles) as average_daily_quota;

-- 8. Create a user online detection view
-- Create a view to check currently "online" users (login within the last 15 minutes)
CREATE OR REPLACE VIEW public.online_users AS
SELECT DISTINCT ON (user_id) 
  user_id,
  username,
  MAX(created_at) as last_activity
FROM 
  public.activity_logs
WHERE 
  created_at >= NOW() - INTERVAL '15 minutes'
GROUP BY 
  user_id, username
ORDER BY 
  user_id, last_activity DESC;

-- 9. Grant appropriate permissions for these new functions and views
DO $$
BEGIN
  -- Grant permissions for all functions
  GRANT EXECUTE ON FUNCTION public.get_active_users_count TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_new_users_count TO authenticated;
  
  -- Grant permissions for views
  GRANT SELECT ON public.user_activity_stats TO authenticated;
  GRANT SELECT ON public.online_users TO authenticated;
  
  -- Check if log_user_activity exists and grant permissions if it does
  IF EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'log_user_activity' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.log_user_activity TO authenticated;
  END IF;
  
  -- Check if get_activity_count_by_action exists and grant permissions if it does
  IF EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'get_activity_count_by_action' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.get_activity_count_by_action TO authenticated;
  END IF;
END
$$;
