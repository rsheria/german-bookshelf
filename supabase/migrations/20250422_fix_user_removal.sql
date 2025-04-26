-- Create a trigger to clean up related data and invalidate all sessions when a user is deleted
CREATE OR REPLACE FUNCTION handle_deleted_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- 1. Invalidate ALL auth sessions (access & refresh tokens)
  PERFORM auth.invalidate_all_user_sessions(OLD.id);

  -- 2. Remove any lingering refresh tokens (defence‑in‑depth)
  DELETE FROM auth.refresh_tokens WHERE user_id = OLD.id;
  DELETE FROM auth.sessions WHERE user_id = OLD.id;
  
  -- 3. Remove user profile
  DELETE FROM public.profiles WHERE id = OLD.id;
  
  -- 4. Remove all custom application sessions
  DELETE FROM public.user_sessions WHERE user_id = OLD.id;
  
  -- 5. Optional audit log
  -- INSERT INTO deleted_users_log(user_id, email, deleted_at) 
  -- VALUES (OLD.id, OLD.email, now());
  
  RETURN OLD;
END;
$$;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_deleted_user();
