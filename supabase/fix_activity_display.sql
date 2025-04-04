-- Fix the login activity logging to properly include username and email
-- This script fixes the issue with login activities not showing proper user information

-- 1. First, let's update the on_auth_user_login function to properly capture username
CREATE OR REPLACE FUNCTION public.on_auth_user_login()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  username_val TEXT;
BEGIN
  -- Get the username from profiles
  SELECT username INTO username_val
  FROM public.profiles
  WHERE id = NEW.id;
  
  -- If no username, use email or id as fallback
  IF username_val IS NULL OR username_val = '' THEN
    username_val := COALESCE(NEW.email, NEW.id::TEXT);
  END IF;
  
  -- Don't insert if there's an error in the transaction
  BEGIN
    -- Use the proper function signature with correct parameter types
    PERFORM public.log_user_activity(
      NEW.id,  -- user_id
      'LOGIN', -- action 
      NULL,   -- entity_id
      'auth', -- entity_type
      NEW.email, -- entity_name (using email here)
      jsonb_build_object(
        'email', NEW.email,
        'username', username_val,
        'last_sign_in_at', NEW.last_sign_in_at
      ), -- details
      NULL    -- ip_address
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the login
    RAISE NOTICE 'Error logging login activity: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Re-enable the trigger for login events
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at
  ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.on_auth_user_login();

-- Also update the activity_logs table to ensure username is correctly populated
-- for existing records where username might be NULL
UPDATE public.activity_logs 
SET username = (
  SELECT profiles.username 
  FROM public.profiles 
  WHERE profiles.id = activity_logs.user_id
)
WHERE username IS NULL OR username = '';

-- Backfill email in entity_name for LOGIN activities if missing
UPDATE public.activity_logs 
SET entity_name = (
  SELECT auth.users.email 
  FROM auth.users 
  WHERE auth.users.id = activity_logs.user_id
)
WHERE action = 'LOGIN' AND (entity_name IS NULL OR entity_name = '');
