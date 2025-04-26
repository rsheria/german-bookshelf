-- 20250424_optimize_rls_policies.sql
-- This migration addresses performance warnings by optimizing RLS policies that use auth functions

-- First, let's create a function to efficiently get the current user ID
-- This avoids repeated calls to auth.uid() which can cause performance issues
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid()
$$;

-- Create a function to check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = get_current_user_id() AND is_admin = true
  )
$$;

-- Drop redundant policies for book_requests
-- Drop all existing policies for book_requests to avoid conflicts
DROP POLICY IF EXISTS "book_requests_user" ON public.book_requests;
DROP POLICY IF EXISTS "br_user_crud" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_insert_own" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_update_own_pending" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_delete_own_pending" ON public.book_requests;
DROP POLICY IF EXISTS "br_user_insert" ON public.book_requests;
DROP POLICY IF EXISTS "br_user_update" ON public.book_requests;
DROP POLICY IF EXISTS "br_user_delete" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_user_insert" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_admin_all" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_select_all_authenticated" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_user_update" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_user_delete" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_read_authenticated" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_delete" ON public.book_requests;

-- Create optimized book_requests policies
CREATE POLICY "book_requests_select_all_authenticated" 
ON public.book_requests FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "book_requests_insert_own" 
ON public.book_requests FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "book_requests_update_own_pending" 
ON public.book_requests FOR UPDATE 
USING (user_id = get_current_user_id() AND status = 'Pending');

CREATE POLICY "book_requests_delete_own_pending" 
ON public.book_requests FOR DELETE 
USING (user_id = get_current_user_id() AND status = 'Pending');

CREATE POLICY "book_requests_admin_all" 
ON public.book_requests 
USING (is_admin());

-- Drop redundant policies for profiles
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_user_quota" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own avatar" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_basic" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- Create optimized profiles policies
CREATE POLICY "profiles_view_basic" 
ON public.profiles FOR SELECT 
USING (CASE WHEN auth.role() = 'anon' THEN id IS NOT NULL ELSE true END);

CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE 
USING (id = get_current_user_id());

CREATE POLICY "profiles_insert_own" 
ON public.profiles FOR INSERT 
WITH CHECK (id = get_current_user_id());

CREATE POLICY "profiles_admin_all" 
ON public.profiles
USING (is_admin());

-- Drop redundant policies for categories
DROP POLICY IF EXISTS "cat_admin_all" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_authenticated" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_new" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated to create categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admins to update categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admins to delete categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;

-- Create optimized categories policies
CREATE POLICY "categories_select_all" 
ON public.categories FOR SELECT 
USING (true);

CREATE POLICY "categories_insert_authenticated" 
ON public.categories FOR INSERT 
WITH CHECK (get_current_user_id() IS NOT NULL);

CREATE POLICY "categories_admin_all" 
ON public.categories
USING (is_admin());

-- Drop redundant policies for activity_logs
DROP POLICY IF EXISTS "activity_logs_user_crud" ON public.activity_logs;
DROP POLICY IF EXISTS "user_login_history" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow users to view their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow admins to view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow users to create their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow admins to manage all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_own" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_admin_all" ON public.activity_logs;

-- Create optimized activity_logs policies
CREATE POLICY "activity_logs_select_own" 
ON public.activity_logs FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "activity_logs_insert_own" 
ON public.activity_logs FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "activity_logs_admin_all" 
ON public.activity_logs
USING (is_admin());

-- Drop redundant policies for book_ratings
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.book_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.book_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_user_crud" ON public.book_ratings;
DROP POLICY IF EXISTS "ratings_user_crud" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_select_all" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_insert_own" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_update_own" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_delete_own" ON public.book_ratings;

-- Create optimized book_ratings policies
CREATE POLICY "book_ratings_select_all" 
ON public.book_ratings FOR SELECT 
USING (true);

CREATE POLICY "book_ratings_insert_own" 
ON public.book_ratings FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "book_ratings_update_own" 
ON public.book_ratings FOR UPDATE 
USING (user_id = get_current_user_id());

CREATE POLICY "book_ratings_delete_own" 
ON public.book_ratings FOR DELETE 
USING (user_id = get_current_user_id());

-- Drop redundant policies for downloads
DROP POLICY IF EXISTS "Users can create their own downloads" ON public.downloads;
DROP POLICY IF EXISTS "Users can view their own downloads" ON public.downloads;
DROP POLICY IF EXISTS "downloads_user" ON public.downloads;
DROP POLICY IF EXISTS "downloads_user_crud" ON public.downloads;
DROP POLICY IF EXISTS "downloads_select_own" ON public.downloads;
DROP POLICY IF EXISTS "downloads_insert_own" ON public.downloads;
DROP POLICY IF EXISTS "downloads_admin_all" ON public.downloads;

-- Create optimized downloads policies
CREATE POLICY "downloads_select_own" 
ON public.downloads FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "downloads_insert_own" 
ON public.downloads FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "downloads_admin_all" 
ON public.downloads
USING (is_admin());

-- Drop redundant policies for download_logs
DROP POLICY IF EXISTS "dl_user_crud" ON public.download_logs;
DROP POLICY IF EXISTS "dl_user_insert" ON public.download_logs;
DROP POLICY IF EXISTS "dl_user_read" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_user_insert" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_user_read" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_select_own" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_insert_own" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_admin_all" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_user_crud" ON public.download_logs;

-- Create optimized download_logs policies
CREATE POLICY "download_logs_select_own" 
ON public.download_logs FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "download_logs_insert_own" 
ON public.download_logs FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "download_logs_admin_all" 
ON public.download_logs
USING (is_admin());

-- Optimize policies for other tables with similar patterns
-- user_sessions
DROP POLICY IF EXISTS "user_sessions_user_crud" ON public.user_sessions;
DROP POLICY IF EXISTS "us_self" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_self" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_admin_all" ON public.user_sessions;

CREATE POLICY "user_sessions_select_own" 
ON public.user_sessions FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "user_sessions_admin_all" 
ON public.user_sessions
USING (is_admin());

-- user_bans
DROP POLICY IF EXISTS "user_bans_user_crud" ON public.user_bans;
DROP POLICY IF EXISTS "ub_self_read" ON public.user_bans;
DROP POLICY IF EXISTS "user_bans_select_own" ON public.user_bans;
DROP POLICY IF EXISTS "user_bans_admin_all" ON public.user_bans;

CREATE POLICY "user_bans_select_own" 
ON public.user_bans FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "user_bans_admin_all" 
ON public.user_bans
USING (is_admin());

-- request_votes
DROP POLICY IF EXISTS "request_votes_user_crud" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_select_all" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_insert_own" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_update_own" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_delete_own" ON public.request_votes;

CREATE POLICY "request_votes_select_all" 
ON public.request_votes FOR SELECT 
USING (true);

CREATE POLICY "request_votes_insert_own" 
ON public.request_votes FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "request_votes_update_own" 
ON public.request_votes FOR UPDATE 
USING (user_id = get_current_user_id());

CREATE POLICY "request_votes_delete_own" 
ON public.request_votes FOR DELETE 
USING (user_id = get_current_user_id());

-- ip_logs
DROP POLICY IF EXISTS "ip_logs_user_crud" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_user_crud" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_select_own" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_insert_own" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_admin_all" ON public.ip_logs;

CREATE POLICY "ip_logs_select_own" 
ON public.ip_logs FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "ip_logs_insert_own" 
ON public.ip_logs FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "ip_logs_admin_all" 
ON public.ip_logs
USING (is_admin());

-- books table
DROP POLICY IF EXISTS "books_allow_admin_all" ON public.books;
DROP POLICY IF EXISTS "books_select_all" ON public.books;
DROP POLICY IF EXISTS "books_admin_all" ON public.books;

CREATE POLICY "books_select_all" 
ON public.books FOR SELECT 
USING (true);

CREATE POLICY "books_admin_all" 
ON public.books
USING (is_admin());
