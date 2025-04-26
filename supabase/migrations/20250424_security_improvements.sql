-- German Bookshelf Security Improvements
-- Date: 2025-04-24

-- SECTION 1: ENABLE RLS ON ALL TABLES
-- This ensures every table has basic protection

-- First, check which tables need RLS enabled (uncomment to run check only)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN 
--   (SELECT tablename FROM pg_tables t JOIN pg_class c ON t.tablename = c.relname 
--    WHERE c.relrowsecurity AND t.schemaname = 'public');

-- Enable RLS on all public tables
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN 
            (SELECT tablename FROM pg_tables t JOIN pg_class c ON t.tablename = c.relname AND t.schemaname = c.relnamespace::regnamespace::text
             WHERE c.relrowsecurity AND t.schemaname = 'public'))
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'Enabled RLS on table: %', r.tablename;
  END LOOP;
END $$;

-- SECTION 2: SECURE BOOK REQUESTS 
-- These policies ensure proper access control for the book request system

-- Books table security
ALTER TABLE IF EXISTS public.books ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "books_select_authenticated" ON public.books;
DROP POLICY IF EXISTS "books_admin_all" ON public.books;

-- Create specific policies for books
CREATE POLICY "books_select_authenticated" 
ON public.books FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "books_admin_all" 
ON public.books 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Book requests security
ALTER TABLE IF EXISTS public.book_requests ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "book_requests_select_authenticated" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_insert_own" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_update_own_pending" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_delete_own_pending" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_admin_all" ON public.book_requests;

-- Create specific policies for book requests
CREATE POLICY "book_requests_select_authenticated" 
ON public.book_requests FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "book_requests_insert_own" 
ON public.book_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "book_requests_update_own_pending" 
ON public.book_requests FOR UPDATE 
USING (auth.uid() = user_id AND status = 'Pending');

CREATE POLICY "book_requests_delete_own_pending" 
ON public.book_requests FOR DELETE 
USING (auth.uid() = user_id AND status = 'Pending');

CREATE POLICY "book_requests_admin_all" 
ON public.book_requests 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- SECTION 3: STORAGE SECURITY FOR AVATARS AND BOOK COVERS

-- Secure storage.buckets
ALTER TABLE IF EXISTS storage.buckets ENABLE ROW LEVEL SECURITY;

-- Policy allowing authenticated users to select from storage buckets
DROP POLICY IF EXISTS "buckets_select_authenticated" ON storage.buckets;
CREATE POLICY "buckets_select_authenticated" 
ON storage.buckets FOR SELECT 
USING (auth.role() = 'authenticated');

-- Secure storage.objects
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow users to select from the avatars bucket (assuming this is public)
DROP POLICY IF EXISTS "avatar_select_authenticated" ON storage.objects;
CREATE POLICY "avatar_select_authenticated" 
ON storage.objects FOR SELECT 
USING (auth.role() = 'authenticated' AND bucket_id = 'avatars');

-- Allow users to upload their own avatar
DROP POLICY IF EXISTS "avatar_insert_own" ON storage.objects;
CREATE POLICY "avatar_insert_own" 
ON storage.objects FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  bucket_id = 'avatars' AND 
  (name = auth.uid() || '.jpg' OR name = auth.uid() || '.png' OR name = auth.uid() || '.gif')
);

-- Admins can manage all storage objects
DROP POLICY IF EXISTS "storage_admin_all" ON storage.objects;
CREATE POLICY "storage_admin_all" 
ON storage.objects 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- SECTION 4: SECURE VOTES, RATINGS AND OTHER RELATED TABLES

-- Secure request_votes table
ALTER TABLE IF EXISTS public.request_votes ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "request_votes_select_all" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_insert_own" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_update_own" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_delete_own" ON public.request_votes;

-- Create proper policies for request_votes
CREATE POLICY "request_votes_select_all" 
ON public.request_votes FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "request_votes_insert_own" 
ON public.request_votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "request_votes_update_own" 
ON public.request_votes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "request_votes_delete_own" 
ON public.request_votes FOR DELETE 
USING (auth.uid() = user_id);

-- Secure book_ratings table
ALTER TABLE IF EXISTS public.book_ratings ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "book_ratings_select_all" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_insert_own" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_update_own" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_delete_own" ON public.book_ratings;

-- Create proper policies for book_ratings
CREATE POLICY "book_ratings_select_all" 
ON public.book_ratings FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "book_ratings_insert_own" 
ON public.book_ratings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "book_ratings_update_own" 
ON public.book_ratings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "book_ratings_delete_own" 
ON public.book_ratings FOR DELETE 
USING (auth.uid() = user_id);

-- SECTION 5: EFFICIENT HELPER FUNCTIONS (avoid repetitive auth.uid() calls)

-- Create efficient helper functions
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
$$;

-- SECTION 6: SECURITY FOR SENSITIVE METADATA AND DOWNLOAD LOGS

-- Secure download_logs table
ALTER TABLE IF EXISTS public.download_logs ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "download_logs_select_own" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_insert_own" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_admin_all" ON public.download_logs;

-- Create proper policies for download_logs
CREATE POLICY "download_logs_select_own" 
ON public.download_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "download_logs_insert_own" 
ON public.download_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "download_logs_admin_all" 
ON public.download_logs 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Secure activity_logs table
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "activity_logs_select_own" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_admin_all" ON public.activity_logs;

-- Create proper policies for activity_logs
CREATE POLICY "activity_logs_select_own" 
ON public.activity_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "activity_logs_insert_own" 
ON public.activity_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_logs_admin_all" 
ON public.activity_logs 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));
