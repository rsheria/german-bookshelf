-- This script focuses only on syncing data, assuming table and policies exist
-- It will migrate data from download_logs to downloads and set up trigger

-- First, check if the downloads table exists, if not show a friendly message
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'downloads') THEN
    RAISE EXCEPTION 'The downloads table does not exist yet. Please run create_downloads_table.sql first.';
  END IF;
END $$;

-- Sync data from download_logs to downloads (one-time migration)
-- This will populate the downloads table with data from download_logs
INSERT INTO public.downloads (user_id, book_id, downloaded_at)
SELECT user_id, book_id, downloaded_at 
FROM public.download_logs
ON CONFLICT DO NOTHING;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS on_download_log_created ON public.download_logs;

-- Drop the function if it already exists
DROP FUNCTION IF EXISTS sync_downloads_from_logs();

-- Create a trigger to keep downloads and download_logs in sync
CREATE OR REPLACE FUNCTION sync_downloads_from_logs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.downloads (user_id, book_id, downloaded_at)
  VALUES (NEW.user_id, NEW.book_id, NEW.downloaded_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_download_log_created
  AFTER INSERT ON public.download_logs
  FOR EACH ROW EXECUTE PROCEDURE sync_downloads_from_logs();
