-- Fix ambiguous column references in book request quota functions

-- First drop the existing functions
DROP FUNCTION IF EXISTS get_user_request_quota(UUID);
DROP FUNCTION IF EXISTS check_monthly_request_limit(UUID);
DROP FUNCTION IF EXISTS create_book_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Fix the get_user_request_quota function
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
    FROM public.book_requests br
    WHERE 
        br.user_id = get_user_request_quota.user_id
        AND date_trunc('month', br.created_at) = date_trunc('month', NOW());
    
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

-- Fix the check_monthly_request_limit function
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
    FROM public.book_requests br
    WHERE 
        br.user_id = check_monthly_request_limit.user_id
        AND date_trunc('month', br.created_at) = date_trunc('month', NOW());
    
    -- Return true if user still has quota available
    RETURN COALESCE(used_quota < max_quota, TRUE);
END;
$$;

-- Fix the create_book_request function
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
