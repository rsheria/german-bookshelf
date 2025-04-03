-- Fixed function for admin updates
DROP FUNCTION IF EXISTS admin_update_book_request;

CREATE OR REPLACE FUNCTION admin_update_book_request(
    request_id UUID,
    new_status TEXT,
    new_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    success INTEGER;
BEGIN
    -- Update the request with provided values
    UPDATE public.book_requests
    SET 
        status = new_status,
        admin_notes = COALESCE(new_admin_notes, admin_notes),
        fulfilled_at = CASE 
            WHEN new_status = 'Fulfilled' THEN NOW()
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = request_id;
    
    -- Check if the update was successful
    GET DIAGNOSTICS success = ROW_COUNT;
    
    RETURN success > 0;
END;
$$;
