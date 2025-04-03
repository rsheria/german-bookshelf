-- Add rating field to books table
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1) CHECK (rating >= 0 AND rating <= 10);

-- Update permissions for the rating field
GRANT ALL ON TABLE public.books TO authenticated;
GRANT ALL ON TABLE public.books TO anon;
GRANT ALL ON TABLE public.books TO service_role;

COMMENT ON COLUMN public.books.rating IS 'Rating score for the book on a scale from 0 to 10';
