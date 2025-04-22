-- Add book_link column to book_requests table for storing link to the fulfilled book
ALTER TABLE IF EXISTS book_requests
ADD COLUMN book_link TEXT DEFAULT NULL;

-- Comment for the new column
COMMENT ON COLUMN book_requests.book_link IS 'Link to the fulfilled book file or download page';
