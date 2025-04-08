-- ADD MISSING FUNCTIONS
-- This script adds additional functions that are required by the frontend

-- ==========================================
-- PART 1: ADD get_top_downloaded_books FUNCTION
-- ==========================================

-- Function to get top downloaded books
CREATE OR REPLACE FUNCTION public.get_top_downloaded_books(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  book_id UUID,
  title TEXT,
  author TEXT,
  download_count BIGINT,
  last_downloaded TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if the download_logs table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'download_logs'
  ) THEN
    RETURN QUERY
    SELECT 
      dl.book_id,
      b.title,
      b.author,
      COUNT(*) as download_count,
      MAX(dl.downloaded_at) as last_downloaded
    FROM public.download_logs dl
    JOIN public.books b ON dl.book_id = b.id
    GROUP BY dl.book_id, b.title, b.author
    ORDER BY download_count DESC, last_downloaded DESC
    LIMIT limit_count;
  ELSE
    -- If download_logs doesn't exist, try to get data from books table only
    -- This is a fallback that will at least return some book data
    RETURN QUERY
    SELECT 
      b.id as book_id,
      b.title,
      b.author,
      0::BIGINT as download_count,
      NULL::TIMESTAMP WITH TIME ZONE as last_downloaded
    FROM public.books b
    ORDER BY b.title
    LIMIT limit_count;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Return empty set rather than failing completely
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure download_logs table exists (if it doesn't, create a minimal version)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'download_logs'
  ) THEN
    CREATE TABLE public.download_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      book_id UUID,
      downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      ip_address TEXT,
      user_agent TEXT
    );
    
    -- Create minimum RLS policies
    ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own downloads" 
      ON public.download_logs 
      FOR SELECT 
      USING (auth.uid() = user_id);
      
    CREATE POLICY "Admins can view all downloads" 
      ON public.download_logs 
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
      
    GRANT ALL ON public.download_logs TO authenticated;
    GRANT ALL ON public.download_logs TO service_role;
  END IF;
END
$$;

-- ==========================================
-- PART 2: ADD download_count FUNCTION
-- ==========================================

-- Function to count downloads for a specific book
CREATE OR REPLACE FUNCTION public.get_book_download_count(book_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  download_count INTEGER;
BEGIN
  -- Check if the download_logs table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'download_logs'
  ) THEN
    SELECT COUNT(*) INTO download_count
    FROM public.download_logs
    WHERE book_id = book_id_param;
    
    RETURN download_count;
  ELSE
    -- If download_logs doesn't exist, return 0
    RETURN 0;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- On error, return 0 to avoid breaking the application
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PART 3: ADD activity_logs IF MISSING
-- ==========================================

-- Create activity_logs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    CREATE TABLE public.activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      username TEXT,
      action TEXT NOT NULL,
      entity_id TEXT,
      entity_type TEXT,
      entity_name TEXT,
      details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      ip_address TEXT,
      user_agent TEXT
    );
    
    -- RLS Policies
    ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own activity logs" 
      ON public.activity_logs 
      FOR SELECT 
      USING (auth.uid() = user_id);
      
    CREATE POLICY "Admins can view all activity logs" 
      ON public.activity_logs 
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
      
    GRANT ALL ON public.activity_logs TO authenticated;
    GRANT ALL ON public.activity_logs TO service_role;
  END IF;
END
$$;

-- ==========================================
-- PART 4: GRANT PERMISSIONS
-- ==========================================

-- Grant permissions for all functions
GRANT EXECUTE ON FUNCTION public.get_top_downloaded_books(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_book_download_count(UUID) TO authenticated;

-- ==========================================
-- PART 5: ADD SAMPLE DATA IF NEEDED
-- ==========================================

-- Add sample data to download_logs if it's empty
DO $$
DECLARE
  download_count INTEGER;
  sample_user_id UUID;
  sample_book_id UUID;
BEGIN
  -- Count existing download logs
  SELECT COUNT(*) INTO download_count FROM public.download_logs;
  
  -- Only add sample data if download_logs is empty
  IF download_count = 0 THEN
    -- Try to get a valid user ID and book ID
    SELECT id INTO sample_user_id FROM public.profiles LIMIT 1;
    SELECT id INTO sample_book_id FROM public.books LIMIT 1;
    
    -- Only proceed if we found both a user and a book
    IF sample_user_id IS NOT NULL AND sample_book_id IS NOT NULL THEN
      -- Add some sample download logs
      INSERT INTO public.download_logs (user_id, book_id, downloaded_at)
      VALUES 
        (sample_user_id, sample_book_id, now() - interval '1 day'),
        (sample_user_id, sample_book_id, now() - interval '2 days'),
        (sample_user_id, sample_book_id, now() - interval '3 days');
    END IF;
  END IF;
END
$$;
