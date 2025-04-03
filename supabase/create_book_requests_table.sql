-- Create Book Requests Table and Related Features

-- Create the book_requests table
CREATE TABLE IF NOT EXISTS book_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    language TEXT NOT NULL DEFAULT 'German',
    format TEXT NOT NULL CHECK (format IN ('Book', 'Audiobook', 'Either')),
    description TEXT,
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Fulfilled', 'Rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    fulfilled_at TIMESTAMP WITH TIME ZONE
);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_book_requests_updated_at
BEFORE UPDATE ON book_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Set up RLS policies for book_requests
ALTER TABLE book_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own requests
CREATE POLICY "Users can view their own book requests"
ON book_requests FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to create their own requests
CREATE POLICY "Users can create their own book requests"
ON book_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own pending requests
CREATE POLICY "Users can update their own pending book requests"
ON book_requests FOR UPDATE
USING (auth.uid() = user_id AND status = 'Pending');

-- Allow users to delete their own pending requests
CREATE POLICY "Users can delete their own pending book requests"
ON book_requests FOR DELETE
USING (auth.uid() = user_id AND status = 'Pending');

-- Create admin role and policies
-- For admins to manage all requests in a single dashboard
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
ON book_requests
TO admin
USING (true)
WITH CHECK (true);

-- Create a view for admin dashboard
CREATE OR REPLACE VIEW admin_book_requests AS
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
GRANT ALL ON TABLE book_requests TO authenticated;
GRANT ALL ON TABLE book_requests TO service_role;
GRANT SELECT ON TABLE admin_book_requests TO service_role;

-- Sample book request function (optional)
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
BEGIN
    -- Get the user ID from the JWT
    v_user_id := auth.uid();
    
    -- Ensure user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
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
