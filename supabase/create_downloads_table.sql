-- Create downloads table
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Adding constraints
  CONSTRAINT downloads_user_id_book_id_key UNIQUE (user_id, book_id, downloaded_at)
);

-- Add RLS (Row Level Security) policies
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
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON public.downloads TO authenticated;
GRANT ALL ON public.downloads TO service_role;
