-- Prevent duplicate download logs per user/book
BEGIN;
  -- Remove existing duplicates, keeping the most recent download per user/book
  WITH duplicate_rows AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, book_id ORDER BY downloaded_at DESC) AS rn
    FROM download_logs
  )
  DELETE FROM download_logs
  WHERE id IN (SELECT id FROM duplicate_rows WHERE rn > 1);

  -- Add unique constraint to prevent future duplicates
  ALTER TABLE download_logs
    ADD CONSTRAINT download_logs_user_book_unique UNIQUE (user_id, book_id);
COMMIT;
