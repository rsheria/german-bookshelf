-- Drop the existing constraint
ALTER TABLE public.book_requests
DROP CONSTRAINT IF EXISTS book_requests_format_check;

-- Add a new constraint that accepts both lowercase and uppercase formats
ALTER TABLE public.book_requests
ADD CONSTRAINT book_requests_format_check 
CHECK (
  format IN (
    'ebook', 'Ebook', 'EBOOK', 
    'audiobook', 'Audiobook', 'AUDIOBOOK', 
    'print', 'Print', 'PRINT',
    'other', 'Other', 'OTHER'
  )
);

-- Alternatively, you can make the check case-insensitive
-- ALTER TABLE public.book_requests
-- ADD CONSTRAINT book_requests_format_check 
-- CHECK (LOWER(format) IN ('ebook', 'audiobook', 'print', 'other'));
