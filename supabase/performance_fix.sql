-- German Bookshelf Performance Optimization Script
-- Date: 2025-04-24
-- Fixes all performance warnings by:
--   1. Making auth functions more efficient (using SELECT subqueries)
--   2. Consolidating redundant policies

-- PART 1: CREATE OPTIMIZED HELPER FUNCTIONS
-- These security definer functions help avoid repeated auth.uid() calls
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE  -- Mark as stable for better query planning
AS $$
  SELECT auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE  -- Mark as stable for better query planning
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = get_current_user_id() AND is_admin = true
  )
$$;

-- PART 2: FIX FOR BOOKS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "books_select_authenticated" ON public.books;
DROP POLICY IF EXISTS "books_admin_all" ON public.books;
DROP POLICY IF EXISTS "books_allow_all_select" ON public.books;
DROP POLICY IF EXISTS "books_public_read" ON public.books;
DROP POLICY IF EXISTS "books_read_anon" ON public.books;
DROP POLICY IF EXISTS "books_read_auth" ON public.books;
DROP POLICY IF EXISTS "books_admin_full" ON public.books;

-- Create consolidated, optimized policies
CREATE POLICY "books_select_all" 
ON public.books FOR SELECT 
USING (true);  -- Allow all users to view books (consolidates all SELECT policies)

-- Single admin policy for all operations - more efficient
CREATE POLICY "books_admin_all_operations" 
ON public.books
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 3: FIX FOR BOOK_REQUESTS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "book_requests_select_authenticated" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_user_crud" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_admin_all" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_insert_own" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_update_own_pending" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_delete_own_pending" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_select_all" ON public.book_requests;
DROP POLICY IF EXISTS "br_auth_read" ON public.book_requests;
DROP POLICY IF EXISTS "br_public_read" ON public.book_requests;

-- Create consolidated, optimized policies
CREATE POLICY "book_requests_select_all" 
ON public.book_requests FOR SELECT 
USING ((SELECT auth.role()) = 'authenticated');  -- Optimized auth check

CREATE POLICY "book_requests_insert_own" 
ON public.book_requests FOR INSERT 
WITH CHECK (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "book_requests_update_own_pending" 
ON public.book_requests FOR UPDATE 
USING (user_id = (SELECT get_current_user_id()) AND status = 'Pending');  -- Optimized with subquery

CREATE POLICY "book_requests_delete_own_pending" 
ON public.book_requests FOR DELETE 
USING (user_id = (SELECT get_current_user_id()) AND status = 'Pending');  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "book_requests_admin_all_operations" 
ON public.book_requests
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 4: FIX FOR PROFILES TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_view_basic" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- Create optimized policies
CREATE POLICY "profiles_view_basic" 
ON public.profiles FOR SELECT 
USING (CASE WHEN (SELECT auth.role()) = 'anon' THEN id IS NOT NULL ELSE true END);  -- Optimized auth check

CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE 
USING (id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "profiles_insert_own" 
ON public.profiles FOR INSERT 
WITH CHECK (id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "profiles_admin_all_operations" 
ON public.profiles
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 5: FIX FOR CATEGORIES TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_authenticated" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
DROP POLICY IF EXISTS "Allow anyone to view categories" ON public.categories;
DROP POLICY IF EXISTS "cat_public_read" ON public.categories;
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;

-- Create consolidated, optimized policies
CREATE POLICY "categories_select_all" 
ON public.categories FOR SELECT 
USING (true);  -- Allow all users to view categories (consolidates all SELECT policies)

CREATE POLICY "categories_insert_authenticated" 
ON public.categories FOR INSERT 
WITH CHECK ((SELECT get_current_user_id()) IS NOT NULL);  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "categories_admin_operations" 
ON public.categories FOR ALL
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 6: FIX FOR ACTIVITY_LOGS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "activity_logs_select_own" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_own" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_admin_all" ON public.activity_logs;

-- Create optimized policies
CREATE POLICY "activity_logs_select_own" 
ON public.activity_logs FOR SELECT 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "activity_logs_insert_own" 
ON public.activity_logs FOR INSERT 
WITH CHECK (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "activity_logs_admin_operations" 
ON public.activity_logs FOR ALL
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 7: FIX FOR BOOK_RATINGS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "book_ratings_select_all" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_insert_own" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_update_own" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_delete_own" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_admin_all" ON public.book_ratings;
DROP POLICY IF EXISTS "Users can view all ratings" ON public.book_ratings;
DROP POLICY IF EXISTS "ratings_admin_all" ON public.book_ratings;

-- Create consolidated, optimized policies
CREATE POLICY "book_ratings_select_all" 
ON public.book_ratings FOR SELECT 
USING (true);  -- Allow all users to view ratings (consolidates all SELECT policies)

CREATE POLICY "book_ratings_insert_own" 
ON public.book_ratings FOR INSERT 
WITH CHECK (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "book_ratings_update_own" 
ON public.book_ratings FOR UPDATE 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "book_ratings_delete_own" 
ON public.book_ratings FOR DELETE 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "book_ratings_admin_operations" 
ON public.book_ratings FOR ALL
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 8: FIX FOR DOWNLOADS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "downloads_select_own" ON public.downloads;
DROP POLICY IF EXISTS "downloads_insert_own" ON public.downloads;
DROP POLICY IF EXISTS "downloads_admin_all" ON public.downloads;

-- Create optimized policies
CREATE POLICY "downloads_select_own" 
ON public.downloads FOR SELECT 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "downloads_insert_own" 
ON public.downloads FOR INSERT 
WITH CHECK (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "downloads_admin_operations" 
ON public.downloads FOR ALL
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 9: FIX FOR DOWNLOAD_LOGS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "download_logs_select_own" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_insert_own" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_admin_all" ON public.download_logs;

-- Create optimized policies
CREATE POLICY "download_logs_select_own" 
ON public.download_logs FOR SELECT 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "download_logs_insert_own" 
ON public.download_logs FOR INSERT 
WITH CHECK (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "download_logs_admin_operations" 
ON public.download_logs FOR ALL
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 10: FIX FOR IP_LOGS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "ip_logs_select_own" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_insert_own" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_admin_all" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_admin_all" ON public.ip_logs;

-- Create optimized policies
CREATE POLICY "ip_logs_select_own" 
ON public.ip_logs FOR SELECT 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "ip_logs_insert_own" 
ON public.ip_logs FOR INSERT 
WITH CHECK (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "ip_logs_admin_operations" 
ON public.ip_logs FOR ALL
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 11: FIX FOR REQUEST_VOTES TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "request_votes_select_all" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_insert_own" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_update_own" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_delete_own" ON public.request_votes;

-- Create optimized policies
CREATE POLICY "request_votes_select_all" 
ON public.request_votes FOR SELECT 
USING (true);  -- Allow all users to view votes

CREATE POLICY "request_votes_insert_own" 
ON public.request_votes FOR INSERT 
WITH CHECK (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "request_votes_update_own" 
ON public.request_votes FOR UPDATE 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

CREATE POLICY "request_votes_delete_own" 
ON public.request_votes FOR DELETE 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

-- PART 12: FIX FOR USER_SESSIONS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_admin_all" ON public.user_sessions;

-- Create optimized policies
CREATE POLICY "user_sessions_select_own" 
ON public.user_sessions FOR SELECT 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "user_sessions_admin_operations" 
ON public.user_sessions FOR ALL
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 13: FIX FOR ACTIVE_SESSIONS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.active_sessions;

-- Create optimized policies
CREATE POLICY "active_sessions_select_own" 
ON public.active_sessions FOR SELECT 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "active_sessions_admin_operations" 
ON public.active_sessions FOR ALL
USING ((SELECT is_admin()));  -- Using subquery for better performance

-- PART 14: FIX FOR USER_BANS TABLE PERFORMANCE WARNINGS

-- Drop existing policies
DROP POLICY IF EXISTS "user_bans_select_own" ON public.user_bans;
DROP POLICY IF EXISTS "user_bans_admin_all" ON public.user_bans;

-- Create optimized policies
CREATE POLICY "user_bans_select_own" 
ON public.user_bans FOR SELECT 
USING (user_id = (SELECT get_current_user_id()));  -- Optimized with subquery

-- Single admin policy - avoids multiple policy evaluation
CREATE POLICY "user_bans_admin_operations" 
ON public.user_bans FOR ALL
USING ((SELECT is_admin()));  -- Using subquery for better performance
