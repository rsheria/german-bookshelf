-- Add premium_only flag to books
ALTER TABLE books
  ADD COLUMN premium_only BOOLEAN NOT NULL DEFAULT FALSE;

-- Enable Row Level Security on download_logs (if not already)
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Policy: allow insert into download_logs only if book is free or user is premium
CREATE POLICY "Allow downloads based on subscription"
  ON download_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM books b
      JOIN profiles p ON p.id = auth.uid()
      WHERE b.id = download_logs.book_id
        AND (NOT b.premium_only OR p.subscription_plan = 'premium')
    )
  );
