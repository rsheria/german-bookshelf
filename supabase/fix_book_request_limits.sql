-- Fix the monthly book request limits
BEGIN;

-- Add monthly_request_limit to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'monthly_request_limit'
  ) THEN
    ALTER TABLE profiles ADD COLUMN monthly_request_limit INTEGER DEFAULT 5;
  END IF;
END $$;

-- Make sure all profiles have a monthly_request_limit value
UPDATE public.profiles 
SET monthly_request_limit = 5
WHERE monthly_request_limit IS NULL OR monthly_request_limit = 0;

-- Update the user metadata to include monthly_request_limit
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || 
  jsonb_build_object(
    'monthly_request_limit', 
    (SELECT monthly_request_limit FROM public.profiles WHERE id = auth.users.id)
  )
WHERE id IN (SELECT id FROM public.profiles);

-- Create or replace a function to check for monthly request limit
CREATE OR REPLACE FUNCTION check_monthly_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  request_count INTEGER;
  user_limit INTEGER;
BEGIN
  -- Get the user's monthly limit
  SELECT monthly_request_limit INTO user_limit
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Default limit if not set
  IF user_limit IS NULL THEN
    user_limit := 5;
  END IF;
  
  -- Count requests made this month
  SELECT COUNT(*) INTO request_count
  FROM public.book_requests
  WHERE user_id = NEW.user_id
  AND created_at >= date_trunc('month', CURRENT_DATE)
  AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
  
  -- If over limit, disallow the insert
  IF request_count >= user_limit THEN
    RAISE EXCEPTION 'Monthly book request limit of % exceeded', user_limit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS check_request_limit ON public.book_requests;

-- Add the trigger to enforce the limit
CREATE TRIGGER check_request_limit
  BEFORE INSERT ON public.book_requests
  FOR EACH ROW
  EXECUTE PROCEDURE check_monthly_request_limit();

-- Create a function to get remaining requests for a user
CREATE OR REPLACE FUNCTION get_remaining_book_requests(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  request_count INTEGER;
  user_limit INTEGER;
BEGIN
  -- Get the user's monthly limit
  SELECT monthly_request_limit INTO user_limit
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- Default limit if not set
  IF user_limit IS NULL THEN
    user_limit := 5;
  END IF;
  
  -- Count requests made this month
  SELECT COUNT(*) INTO request_count
  FROM public.book_requests
  WHERE user_id = user_uuid
  AND created_at >= date_trunc('month', CURRENT_DATE)
  AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
  
  -- Return remaining
  RETURN GREATEST(0, user_limit - request_count);
END;
$$ LANGUAGE plpgsql;

COMMIT;
