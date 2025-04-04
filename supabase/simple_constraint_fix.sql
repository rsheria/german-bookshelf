-- Just drop the constraint entirely - this is the simplest solution
ALTER TABLE public.book_requests
DROP CONSTRAINT IF EXISTS book_requests_format_check;

-- That's it! Without the constraint, any format value will work.
