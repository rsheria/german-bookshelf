-- Comprehensive fix for book requests persistence issues

-- 1. Drop existing policies to create clean ones
DROP POLICY IF EXISTS "Users can create book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can view their own book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can update their own pending book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can delete their own pending book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Service role can do everything with book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Admins can do everything with book requests" ON public.book_requests;

-- 2. Create proper RLS policies with explicit roles
-- Allow authenticated users to INSERT their own requests
CREATE POLICY "Users can create book requests"
ON public.book_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own requests
CREATE POLICY "Users can view their own book requests"
ON public.book_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own pending requests
CREATE POLICY "Users can update their own pending book requests"
ON public.book_requests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'Pending');

-- Allow users to delete their own pending requests
CREATE POLICY "Users can delete their own pending book requests"
ON public.book_requests FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'Pending');

-- CRUCIAL FIX: Service role needs unrestricted permissions for admin operations
CREATE POLICY "Service role full access"
ON public.book_requests
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Explicitly grant permissions
GRANT ALL ON TABLE public.book_requests TO authenticated;
GRANT ALL ON TABLE public.book_requests TO service_role;

-- 4. Update the admin view to ensure it stays in sync
DROP VIEW IF EXISTS public.admin_book_requests;

CREATE VIEW public.admin_book_requests AS
SELECT 
    br.*,
    p.username as requester_username
FROM 
    public.book_requests br
JOIN 
    public.profiles p ON br.user_id = p.id
ORDER BY 
    CASE 
        WHEN br.status = 'Pending' THEN 1
        WHEN br.status = 'Approved' THEN 2
        WHEN br.status = 'Fulfilled' THEN 3
        WHEN br.status = 'Rejected' THEN 4
    END,
    CASE 
        WHEN br.priority = 'High' THEN 1
        WHEN br.priority = 'Medium' THEN 2
        WHEN br.priority = 'Low' THEN 3
        ELSE 4
    END,
    br.created_at DESC;

-- Grant appropriate permissions to the view
GRANT SELECT ON TABLE public.admin_book_requests TO service_role;

-- 5. Create a stored procedure for admin updates that bypasses RLS
CREATE OR REPLACE FUNCTION admin_update_book_request(
    request_id UUID,
    new_status TEXT,
    new_admin_notes TEXT DEFAULT NULL,
    new_fulfilled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    success BOOLEAN;
BEGIN
    -- Update the request with provided values
    UPDATE public.book_requests
    SET 
        status = new_status,
        admin_notes = COALESCE(new_admin_notes, admin_notes),
        fulfilled_at = CASE 
            WHEN new_status = 'Fulfilled' AND new_fulfilled_at IS NULL THEN NOW()
            WHEN new_status = 'Fulfilled' THEN new_fulfilled_at
            WHEN new_status != 'Fulfilled' THEN NULL
            ELSE fulfilled_at
        END,
        updated_at = NOW()
    WHERE id = request_id;
    
    -- Check if the update was successful
    GET DIAGNOSTICS success = ROW_COUNT;
    
    RETURN success > 0;
END;
$$;
