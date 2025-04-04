-- First, let's check what the current format constraint is
-- And then modify it to accept all format values from the frontend

-- Option 1: Modify the constraint to accept any format
ALTER TABLE public.book_requests
DROP CONSTRAINT IF EXISTS book_requests_format_check;

ALTER TABLE public.book_requests
ADD CONSTRAINT book_requests_format_check 
CHECK (format IN ('ebook', 'audiobook', 'print', 'other'));

-- Option 2: If you want to completely remove the constraint
-- ALTER TABLE public.book_requests
-- DROP CONSTRAINT IF EXISTS book_requests_format_check;
