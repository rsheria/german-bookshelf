-- Create admin role and admin view for book requests

-- Create admin role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles WHERE rolname = 'admin'
    ) THEN
        CREATE ROLE admin;
    END IF;
END
$$;

-- Allow admins to do everything with book_requests
CREATE POLICY "Admins can do everything with book requests"
ON public.book_requests
TO admin
USING (true)
WITH CHECK (true);

-- Create a view for admin dashboard
CREATE OR REPLACE VIEW public.admin_book_requests AS
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

-- Grant appropriate permissions
GRANT SELECT ON TABLE public.admin_book_requests TO service_role;
