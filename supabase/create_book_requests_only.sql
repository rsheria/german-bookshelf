-- Create Book Requests Table (Simplified Version)

-- Make sure we have the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the book_requests table
CREATE TABLE IF NOT EXISTS public.book_requests (
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

-- Grant permissions
GRANT ALL ON TABLE public.book_requests TO authenticated;
GRANT ALL ON TABLE public.book_requests TO service_role;
