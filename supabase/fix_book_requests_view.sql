-- Drop and recreate the admin_book_requests view without the email field
DROP VIEW IF EXISTS admin_book_requests;

CREATE VIEW admin_book_requests AS
SELECT 
    br.*,
    p.username as requester_username
FROM 
    book_requests br
JOIN 
    profiles p ON br.user_id = p.id
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
GRANT SELECT ON TABLE admin_book_requests TO service_role;
