-- Create a view that includes download counts per book
CREATE OR REPLACE VIEW books_with_download_count AS
SELECT
  b.*,  
  COALESCE(dl.download_count, 0) AS download_count
FROM books b
LEFT JOIN (
  SELECT book_id, COUNT(*) AS download_count
  FROM download_logs
  GROUP BY book_id
) dl ON b.id = dl.book_id;

-- Grant select on view to ensure it's queryable
GRANT SELECT ON books_with_download_count TO public;
