-- Migration: Fix book request quota functions to use monthly_request_quota
BEGIN;

-- 1. Replace trigger function to enforce monthly_request_quota
CREATE OR REPLACE FUNCTION public.check_monthly_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  request_count INTEGER;
  user_limit INTEGER;
BEGIN
  -- Get the user's monthly quota
  SELECT monthly_request_quota INTO user_limit
    FROM public.profiles
    WHERE id = NEW.user_id;
  
  IF user_limit IS NULL OR user_limit = 0 THEN
    user_limit := 5;
  END IF;
  
  -- Count requests made this month
  SELECT COUNT(*) INTO request_count
    FROM public.book_requests
    WHERE user_id = NEW.user_id
      AND created_at >= date_trunc('month', now())
      AND created_at < date_trunc('month', now()) + INTERVAL '1 month';
  
  IF request_count >= user_limit THEN
    RAISE EXCEPTION 'Monthly book request limit of % reached', user_limit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Replace function to get remaining monthly requests
CREATE OR REPLACE FUNCTION public.get_remaining_book_requests(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  request_count INTEGER;
  user_limit INTEGER;
BEGIN
  -- Get the user's monthly quota
  SELECT monthly_request_quota INTO user_limit
    FROM public.profiles
    WHERE id = user_uuid;
  
  IF user_limit IS NULL OR user_limit = 0 THEN
    user_limit := 5;
  END IF;
  
  -- Count requests made this month
  SELECT COUNT(*) INTO request_count
    FROM public.book_requests
    WHERE user_id = user_uuid
      AND created_at >= date_trunc('month', now())
      AND created_at < date_trunc('month', now()) + INTERVAL '1 month';
  
  RETURN GREATEST(0, user_limit - request_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
