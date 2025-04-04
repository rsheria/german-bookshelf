-- Drop the table if it exists to start fresh
DROP TABLE IF EXISTS public.downloads;

-- Create the downloads table
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
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

-- Policy for admins to view all downloads - modified to work without role column
-- This assumes you have a way to identify admins (adjust as needed for your schema)
CREATE POLICY "Admins can view all downloads"
  ON public.downloads
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE is_admin = true
    )
  );

-- Grant permissions
GRANT ALL ON public.downloads TO authenticated;
GRANT ALL ON public.downloads TO service_role;

-- OPTIONAL: Add some sample data for testing (replace user_ids and book_ids with actual values)
-- INSERT INTO public.downloads (user_id, book_id)
-- VALUES 
--   ('actual-user-id-here', 'actual-book-id-here'),
--   ('actual-user-id-here', 'different-book-id-here');

-- Create download_logs table for quota tracking if it doesn't exist
CREATE TABLE IF NOT EXISTS public.download_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS for download_logs
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

-- Add policies for download_logs
CREATE POLICY "Users can view their own download logs"
  ON public.download_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own download logs"
  ON public.download_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all download logs" 
  ON public.download_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE is_admin = true
    )
  );

-- Grant permissions for download_logs
GRANT ALL ON public.download_logs TO authenticated;
GRANT ALL ON public.download_logs TO service_role;
