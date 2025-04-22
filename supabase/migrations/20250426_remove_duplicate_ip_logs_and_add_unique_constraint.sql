-- Remove duplicates in batches to avoid long locks
DO $$
DECLARE
  rows_deleted INT;
BEGIN
  LOOP
    DELETE FROM ip_logs
    USING (
      SELECT a.id
      FROM ip_logs a
      JOIN ip_logs b
        ON a.user_id = b.user_id
       AND a.ip_address = b.ip_address
      WHERE a.created_at < b.created_at
         OR (a.created_at = b.created_at AND a.id < b.id)
      LIMIT 1000
    ) AS dup
    WHERE ip_logs.id = dup.id;
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    EXIT WHEN rows_deleted = 0;
  END LOOP;
END $$;

-- Add unique constraint to prevent future duplicates
ALTER TABLE ip_logs
  ADD CONSTRAINT ip_logs_user_id_ip_address_unique
  UNIQUE (user_id, ip_address);
