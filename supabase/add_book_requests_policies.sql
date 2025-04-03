-- Add trigger and policies after table creation

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_book_requests_updated_at
BEFORE UPDATE ON public.book_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Set up RLS policies for book_requests
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own requests
CREATE POLICY "Users can view their own book requests"
ON public.book_requests FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to create their own requests
CREATE POLICY "Users can create their own book requests"
ON public.book_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own pending requests
CREATE POLICY "Users can update their own pending book requests"
ON public.book_requests FOR UPDATE
USING (auth.uid() = user_id AND status = 'Pending');

-- Allow users to delete their own pending requests
CREATE POLICY "Users can delete their own pending book requests"
ON public.book_requests FOR DELETE
USING (auth.uid() = user_id AND status = 'Pending');
