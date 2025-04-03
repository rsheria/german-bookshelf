-- Add monthly limit for book requests

-- 1. Add a column to profiles for monthly request quota
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS monthly_request_quota INTEGER DEFAULT 5 NOT NULL;

-- 2. Create a function to check if a user has reached their monthly limit
CREATE OR REPLACE FUNCTION check_monthly_request_limit(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    used_quota INTEGER;
    max_quota INTEGER;
BEGIN
    -- Get the user's monthly quota
    SELECT monthly_request_quota INTO max_quota
    FROM public.profiles
    WHERE id = user_id;
    
    -- Count requests made this month
    SELECT COUNT(*) INTO used_quota
    FROM public.book_requests
    WHERE 
        user_id = check_monthly_request_limit.user_id 
        AND date_trunc('month', created_at) = date_trunc('month', NOW());
    
    -- Return true if user still has quota available
    RETURN COALESCE(used_quota < max_quota, TRUE);
END;
$$;

-- 3. Create a function to get user's remaining quota
CREATE OR REPLACE FUNCTION get_user_request_quota(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    used_quota INTEGER;
    max_quota INTEGER;
    result JSONB;
BEGIN
    -- Get the user's monthly quota
    SELECT monthly_request_quota INTO max_quota
    FROM public.profiles
    WHERE id = user_id;
    
    -- Count requests made this month
    SELECT COUNT(*) INTO used_quota
    FROM public.book_requests
    WHERE 
        user_id = get_user_request_quota.user_id 
        AND date_trunc('month', created_at) = date_trunc('month', NOW());
    
    -- Build result JSON with quota info
    result := jsonb_build_object(
        'used', used_quota,
        'max', max_quota,
        'remaining', max_quota - used_quota,
        'canRequest', used_quota < max_quota
    );
    
    RETURN result;
END;
$$;

-- 4. Update the book request function to respect the monthly quota
CREATE OR REPLACE FUNCTION create_book_request(
    p_title TEXT,
    p_author TEXT DEFAULT NULL,
    p_language TEXT DEFAULT 'German',
    p_format TEXT DEFAULT 'Book',
    p_description TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'Medium'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_request_id UUID;
    v_can_request BOOLEAN;
BEGIN
    -- Get the user ID from the JWT
    v_user_id := auth.uid();
    
    -- Ensure user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    -- Check if user has reached the monthly limit
    v_can_request := check_monthly_request_limit(v_user_id);
    
    IF NOT v_can_request THEN
        RAISE EXCEPTION 'Monthly request limit reached. Please try again next month.';
    END IF;
    
    -- Insert the new book request
    INSERT INTO book_requests (
        user_id,
        title,
        author,
        language,
        format,
        description,
        priority,
        status
    ) VALUES (
        v_user_id,
        p_title,
        p_author,
        p_language,
        p_format,
        p_description,
        p_priority,
        'Pending'
    )
    RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$;

-- 5. Add an admin function to adjust user's monthly quota
CREATE OR REPLACE FUNCTION admin_set_monthly_request_quota(
    user_id UUID,
    new_quota INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    success INTEGER;
BEGIN
    -- Update the user's monthly quota
    UPDATE public.profiles
    SET monthly_request_quota = new_quota
    WHERE id = user_id;
    
    -- Check if the update was successful
    GET DIAGNOSTICS success = ROW_COUNT;
    
    RETURN success > 0;
END;
$$;
