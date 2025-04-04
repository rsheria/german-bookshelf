-- Fix active users count and recent downloads tracking

-- 1. Improve active users functions to properly count users
CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  active_count BIGINT;
BEGIN
  -- More accurately count active users (logged in within last 30 days)
  SELECT COUNT(DISTINCT user_id) INTO active_count
  FROM public.activity_logs
  WHERE action = 'LOGIN'
  AND created_at >= NOW() - INTERVAL '30 days';
  
  RETURN COALESCE(active_count, 0);
END;
$$;

-- 2. Create a function to count currently online users
CREATE OR REPLACE FUNCTION public.get_online_users_count()
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  online_count BIGINT;
BEGIN
  -- Count users active in the last 15 minutes
  SELECT COUNT(DISTINCT user_id) INTO online_count
  FROM public.activity_logs
  WHERE created_at >= NOW() - INTERVAL '15 minutes';
  
  RETURN COALESCE(online_count, 0);
END;
$$;

-- 3. Improve the download logging trigger
CREATE OR REPLACE FUNCTION public.log_download_activity()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  book_title TEXT;
  username_val TEXT;
BEGIN
  -- Get the book title
  SELECT title INTO book_title 
  FROM public.books 
  WHERE id = NEW.book_id;
  
  -- Get the username
  SELECT username INTO username_val
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- If we couldn't find a username, use the user_id as fallback
  IF username_val IS NULL OR username_val = '' THEN
    username_val := NEW.user_id::TEXT;
  END IF;
  
  -- Don't insert if there's an error
  BEGIN
    INSERT INTO public.activity_logs (
      user_id,
      username,
      action,
      entity_id,
      entity_type,
      entity_name,
      details,
      created_at
    ) VALUES (
      NEW.user_id,
      username_val,
      'DOWNLOAD',
      NEW.book_id,
      'book',
      book_title,
      jsonb_build_object(
        'format', NEW.format,
        'download_id', NEW.id,
        'book_title', book_title
      ),
      NEW.created_at
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the download
    RAISE NOTICE 'Error logging download activity: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 4. Create or recreate the download trigger
DROP TRIGGER IF EXISTS on_download_insert ON public.downloads;
CREATE TRIGGER on_download_insert
  AFTER INSERT ON public.downloads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_download_activity();

-- 5. Update the user_activity_stats view to include online users
CREATE OR REPLACE VIEW public.user_activity_stats AS
SELECT
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE is_admin = true) as admin_users,
  (SELECT public.get_active_users_count()) as active_users,
  (SELECT public.get_online_users_count()) as online_users,
  (SELECT public.get_new_users_count('today')) as new_users_today,
  (SELECT public.get_new_users_count('week')) as new_users_this_week,
  (SELECT public.get_new_users_count('month')) as new_users_this_month,
  (SELECT AVG(daily_quota) FROM public.profiles) as average_daily_quota;

-- 6. Create a view specifically for recent downloads
CREATE OR REPLACE VIEW public.recent_downloads AS
SELECT 
  a.id,
  a.user_id,
  a.username,
  a.created_at,
  a.entity_id as book_id,
  a.entity_name as book_title,
  (a.details->>'format')::TEXT as format
FROM 
  public.activity_logs a
WHERE 
  a.action = 'DOWNLOAD'
ORDER BY 
  a.created_at DESC;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_active_users_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_users_count TO authenticated;
GRANT SELECT ON public.user_activity_stats TO authenticated;
GRANT SELECT ON public.recent_downloads TO authenticated;
