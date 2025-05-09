-- PRODUCTION-READY FIX FOR DOWNLOAD HISTORY
-- This script specifically fixes issues with the download_logs table and its relationships

-- First, drop all existing policies that might be using the user_id column
DROP POLICY IF EXISTS "Users can view their own download logs" ON download_logs;
DROP POLICY IF EXISTS "Users can create their own download logs" ON download_logs;
DROP POLICY IF EXISTS "Users can view download logs" ON download_logs;
DROP POLICY IF EXISTS "download_logs_select_policy" ON download_logs;
DROP POLICY IF EXISTS "download_logs_insert_policy" ON download_logs;
DROP POLICY IF EXISTS "download_logs_delete_policy" ON download_logs;

-- Now we can safely alter the column type if needed
DO $$
BEGIN
  -- Check if column is already UUID type
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'download_logs' AND column_name = 'user_id') 
      NOT LIKE '%uuid%' THEN
    -- Only alter if not already UUID
    ALTER TABLE download_logs 
    ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
  END IF;
END $$;

-- Set automatic timestamps and NOT NULL constraints
ALTER TABLE download_logs 
ALTER COLUMN downloaded_at SET DEFAULT now(),
ALTER COLUMN downloaded_at SET NOT NULL;

-- Ensure download_logs table has proper RLS
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Create proper policies for download history
CREATE POLICY "Users can view their own download logs" 
ON download_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Create a policy allowing inserts when the user_id matches
CREATE POLICY "Users can add their own download logs" 
ON download_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix the books table policies to ensure join queries work
DROP POLICY IF EXISTS "books_select_policy" ON books;
DROP POLICY IF EXISTS "Anyone can view books" ON books;

-- Allow anyone to read books - this is critical for the join query
CREATE POLICY "Anyone can view books" 
ON books FOR SELECT 
USING (true);

-- Ensure indices exist for performance
CREATE INDEX IF NOT EXISTS idx_download_logs_user_id ON download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_book_id ON download_logs(book_id);

-- Fix foreign key relationship if needed
DO $$
BEGIN
  -- Check if foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'download_logs_book_id_fkey' 
    AND table_name = 'download_logs'
  ) THEN
    -- Add foreign key if it doesn't exist
    ALTER TABLE download_logs
    ADD CONSTRAINT download_logs_book_id_fkey
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make sure users have proper permissions to all necessary tables
GRANT ALL ON TABLE download_logs TO authenticated;
GRANT ALL ON TABLE books TO authenticated;
GRANT ALL ON TABLE profiles TO authenticated;

-- Comment to explain what this script does
COMMENT ON TABLE download_logs IS 'Records of user book downloads with proper access controls';
