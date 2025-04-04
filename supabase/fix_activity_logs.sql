-- Fix for activity logs triggers causing login issues
BEGIN;

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

-- Revise the function to handle NULL values and add error handling
CREATE OR REPLACE FUNCTION log_user_login() 
RETURNS TRIGGER AS $$
BEGIN
  -- Add defensive checks
  IF NEW IS NULL OR NEW.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Safely perform the activity logging with error handling
  BEGIN
    PERFORM log_user_activity(
      NEW.id, 
      'LOGIN', 
      NULL, 
      'auth',
      COALESCE(NEW.email, 'unknown'),
      jsonb_build_object('last_sign_in_at', NEW.last_sign_in_at),
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't block the login
    RAISE WARNING 'Error in log_user_login trigger: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger with better error handling
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at
  ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION log_user_login();

-- Also improve the book download trigger with similar error handling
CREATE OR REPLACE FUNCTION log_book_download() 
RETURNS TRIGGER AS $$
DECLARE
  book_title TEXT;
BEGIN
  -- Defensive check
  IF NEW IS NULL OR NEW.user_id IS NULL OR NEW.book_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- Get the book title
    SELECT title INTO book_title
    FROM public.books
    WHERE id = NEW.book_id;

    -- Log the download activity
    PERFORM log_user_activity(
      NEW.user_id, 
      'DOWNLOAD', 
      NEW.book_id, 
      'book',
      COALESCE(book_title, 'unknown book'),
      jsonb_build_object('download_id', NEW.id),
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't block the download
    RAISE WARNING 'Error in log_book_download trigger: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
