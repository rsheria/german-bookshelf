-- Add additional metadata columns to book_requests table
ALTER TABLE IF EXISTS book_requests
ADD COLUMN publisher TEXT DEFAULT NULL,
ADD COLUMN published_year TEXT DEFAULT NULL;

-- Comment for these changes
COMMENT ON COLUMN book_requests.publisher IS 'Publisher of the book';
COMMENT ON COLUMN book_requests.published_year IS 'Year the book was published';
