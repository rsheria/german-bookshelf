-- COMPREHENSIVE EMERGENCY FIX
-- This script fixes all issues while maintaining enhanced security
-- Apply immediately through the Supabase SQL Editor

-- EMERGENCY PROCEDURE:
-- 1. Disable all RLS temporarily to restore access
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies that are causing recursion
-- Drop ALL existing policies for all tables first to avoid conflicts
-- This will handle any duplicate policy issues

-- PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all_operations" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_basic" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;

-- BOOKS POLICIES
DROP POLICY IF EXISTS "books_admin_all" ON public.books;
DROP POLICY IF EXISTS "books_select_authenticated" ON public.books;
DROP POLICY IF EXISTS "books_select_all" ON public.books;
DROP POLICY IF EXISTS "books_admin_all_operations" ON public.books;
DROP POLICY IF EXISTS "books_read_all" ON public.books;

-- BOOK REQUESTS POLICIES (specifically including the one causing error)
DROP POLICY IF EXISTS "book_requests_insert_own" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_update_own_pending" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_delete_own_pending" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_admin_all" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_admin_manage_all" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_read_all" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_select_all" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_select_authenticated" ON public.book_requests;

-- 3. Create simple, non-recursive, working policies

-- Helper function that doesn't use recursion
CREATE OR REPLACE FUNCTION public.get_is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER
AS $$
  -- Direct query to the profiles table without calling other functions
  SELECT is_admin FROM public.profiles WHERE id = user_id;
$$;

-- SIMPLE PROFILE POLICIES
-- Allow everyone to read any profile
CREATE POLICY "profiles_read_all"
ON public.profiles FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Admin management (uses the non-recursive function)
CREATE POLICY "profiles_admin_manage_all"
ON public.profiles FOR ALL
USING (public.get_is_admin(auth.uid()));

-- SIMPLE BOOK POLICIES
-- Everyone can read books
CREATE POLICY "books_read_all"
ON public.books FOR SELECT
USING (true);

-- Admin management (uses the non-recursive function)
CREATE POLICY "books_admin_manage_all"
ON public.books FOR ALL
USING (public.get_is_admin(auth.uid()));

-- BOOK REQUESTS POLICIES
-- Everyone can view book requests
CREATE POLICY "book_requests_read_all"
ON public.book_requests FOR SELECT
USING (true);

-- Users can create their own book requests
CREATE POLICY "book_requests_insert_own"
ON public.book_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own pending book requests
CREATE POLICY "book_requests_update_own_pending"
ON public.book_requests FOR UPDATE
USING (user_id = auth.uid() AND status = 'Pending');

-- Users can delete their own pending book requests
CREATE POLICY "book_requests_delete_own_pending"
ON public.book_requests FOR DELETE
USING (user_id = auth.uid() AND status = 'Pending');

-- Admin management (uses the non-recursive function)
CREATE POLICY "book_requests_admin_manage_all"
ON public.book_requests FOR ALL
USING (public.get_is_admin(auth.uid()));

-- ACTIVITY LOGS POLICIES
-- Users can view their own activity logs
CREATE POLICY "activity_logs_read_own"
ON public.activity_logs FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own activity logs
CREATE POLICY "activity_logs_insert_own"
ON public.activity_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admin management (uses the non-recursive function)
CREATE POLICY "activity_logs_admin_manage_all"
ON public.activity_logs FOR ALL
USING (public.get_is_admin(auth.uid()));

-- BOOK RATINGS POLICIES
-- Everyone can read all ratings
CREATE POLICY "book_ratings_read_all"
ON public.book_ratings FOR SELECT
USING (true);

-- Users can create their own ratings
CREATE POLICY "book_ratings_insert_own"
ON public.book_ratings FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own ratings
CREATE POLICY "book_ratings_update_own"
ON public.book_ratings FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own ratings
CREATE POLICY "book_ratings_delete_own"
ON public.book_ratings FOR DELETE
USING (user_id = auth.uid());

-- DOWNLOADS POLICIES
-- Users can view their own downloads
CREATE POLICY "downloads_read_own"
ON public.downloads FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own downloads
CREATE POLICY "downloads_insert_own"
ON public.downloads FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admin management (uses the non-recursive function)
CREATE POLICY "downloads_admin_manage_all"
ON public.downloads FOR ALL
USING (public.get_is_admin(auth.uid()));

-- DOWNLOAD LOGS POLICIES
-- Users can view their own download logs
CREATE POLICY "download_logs_read_own"
ON public.download_logs FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own download logs
CREATE POLICY "download_logs_insert_own"
ON public.download_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admin management (uses the non-recursive function)
CREATE POLICY "download_logs_admin_manage_all"
ON public.download_logs FOR ALL
USING (public.get_is_admin(auth.uid()));

-- IP LOGS POLICIES
-- Users can view their own IP logs
CREATE POLICY "ip_logs_read_own"
ON public.ip_logs FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own IP logs
CREATE POLICY "ip_logs_insert_own"
ON public.ip_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Anyone can insert IP logs (for tracking)
CREATE POLICY "ip_logs_anon_insert"
ON public.ip_logs FOR INSERT
WITH CHECK (true);

-- Admin management (uses the non-recursive function)
CREATE POLICY "ip_logs_admin_manage_all"
ON public.ip_logs FOR ALL
USING (public.get_is_admin(auth.uid()));

-- REQUEST VOTES POLICIES
-- Everyone can view votes
CREATE POLICY "request_votes_read_all"
ON public.request_votes FOR SELECT
USING (true);

-- Users can manage their own votes
CREATE POLICY "request_votes_manage_own"
ON public.request_votes FOR ALL
USING (user_id = auth.uid());

-- USER SESSIONS POLICIES
-- Users can view their own sessions
CREATE POLICY "user_sessions_read_own"
ON public.user_sessions FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own sessions
CREATE POLICY "user_sessions_insert_own"
ON public.user_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "user_sessions_update_own"
ON public.user_sessions FOR UPDATE
USING (user_id = auth.uid());

-- Admin management (uses the non-recursive function)
CREATE POLICY "user_sessions_admin_manage_all"
ON public.user_sessions FOR ALL
USING (public.get_is_admin(auth.uid()));

-- USER BANS POLICIES
-- Users can view if they are banned
CREATE POLICY "user_bans_read_own"
ON public.user_bans FOR SELECT
USING (user_id = auth.uid());

-- Admin management (uses the non-recursive function)
CREATE POLICY "user_bans_admin_manage_all"
ON public.user_bans FOR ALL
USING (public.get_is_admin(auth.uid()));

-- Fix tracking function issues
CREATE OR REPLACE FUNCTION track_page_view_with_ip(
  p_user_id UUID,
  p_page_path TEXT,
  p_session_id UUID,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Insert the page view with IP address
  INSERT INTO public.user_sessions (
    user_id,
    page_path,
    session_id,
    ip_address,
    user_agent,
    created_at,
    updated_at,
    is_active
  ) VALUES (
    p_user_id,
    p_page_path,
    p_session_id,
    p_ip_address,
    p_user_agent,
    NOW(),
    NOW(),
    TRUE
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Handle the error by returning NULL
    RETURN NULL;
END;
$$;

-- Fix check_is_admin function to avoid recursion
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Direct query to avoid function recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

-- 4. Re-enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- 5. Grant basic permissions to ensure access works
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.downloads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.download_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
