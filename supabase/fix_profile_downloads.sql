-- Create the missing downloads table specifically for profile history display
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own downloads
CREATE POLICY "Users can view their own downloads"
  ON public.downloads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to create their own downloads
CREATE POLICY "Users can create their own downloads"
  ON public.downloads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for admins to view all downloads
CREATE POLICY "Admins can view all downloads"
  ON public.downloads
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Grant permissions
GRANT ALL ON public.downloads TO authenticated;
GRANT ALL ON public.downloads TO service_role;

-- Sync data from download_logs to downloads (one-time migration)
-- This will populate the downloads table with data from download_logs
INSERT INTO public.downloads (user_id, book_id, downloaded_at)
SELECT user_id, book_id, downloaded_at 
FROM public.download_logs
ON CONFLICT DO NOTHING;

-- Create a trigger to keep downloads and download_logs in sync
CREATE OR REPLACE FUNCTION sync_downloads_from_logs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.downloads (user_id, book_id, downloaded_at)
  VALUES (NEW.user_id, NEW.book_id, NEW.downloaded_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_download_log_created
  AFTER INSERT ON public.download_logs
  FOR EACH ROW EXECUTE PROCEDURE sync_downloads_from_logs();
