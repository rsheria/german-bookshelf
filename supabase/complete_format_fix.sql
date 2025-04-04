-- First, completely remove the constraint
ALTER TABLE public.book_requests
DROP CONSTRAINT IF EXISTS book_requests_format_check;

-- The simplest approach is to simply remove the constraint entirely:
-- That's it! You're done. Without the constraint, any format value will work.

-- OPTIONAL: If you want to keep some kind of validation
-- but need to accommodate existing data, you can:

-- 1. Look at what format values already exist in the database:
/*
SELECT DISTINCT format FROM public.book_requests;
*/

-- 2. Update any non-standard format values (optional)
/*
UPDATE public.book_requests 
SET format = 'ebook' 
WHERE LOWER(format) LIKE '%ebook%';

UPDATE public.book_requests 
SET format = 'audiobook' 
WHERE LOWER(format) LIKE '%audio%';

UPDATE public.book_requests 
SET format = 'print' 
WHERE LOWER(format) LIKE '%print%';

UPDATE public.book_requests 
SET format = 'other' 
WHERE format NOT IN ('ebook', 'audiobook', 'print');
*/

-- 3. Re-add a more permissive constraint if desired
/*
ALTER TABLE public.book_requests
ADD CONSTRAINT book_requests_format_check 
CHECK (
  LOWER(format) IN ('ebook', 'audiobook', 'print', 'other')
);
*/
