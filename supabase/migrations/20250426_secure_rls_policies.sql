-- Migration: Secure RLS Policies for All Critical Tables
-- Generated on 2025-04-26

-- 1. Enable RLS on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy/overly-permissive policies
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Allow full read access to all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can read books" ON public.books;
DROP POLICY IF EXISTS "Only admins can insert books" ON public.books;
DROP POLICY IF EXISTS "Only admins can update books" ON public.books;
DROP POLICY IF EXISTS "Only admins can delete books" ON public.books;

DROP POLICY IF EXISTS "Users can view their own book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can create their own book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can update their own pending book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Users can delete their own pending book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Service role can do everything with book requests" ON public.book_requests;

DROP POLICY IF EXISTS "Users can view their own download logs" ON public.download_logs;
DROP POLICY IF EXISTS "Users can create their own download logs" ON public.download_logs;
DROP POLICY IF EXISTS "Admins can view all download logs" ON public.download_logs;

DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;

DROP POLICY IF EXISTS "Users can view their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Admins can view all IP logs" ON public.ip_logs;

-- 3. Add secure, role-based policies

-- PROFILES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_authenticated_user_admin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_authenticated_user_admin());

-- BOOKS
CREATE POLICY "Anyone can read books"
  ON public.books FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert books"
  ON public.books FOR INSERT
  WITH CHECK (public.is_authenticated_user_admin());

CREATE POLICY "Only admins can update books"
  ON public.books FOR UPDATE
  USING (public.is_authenticated_user_admin());

CREATE POLICY "Only admins can delete books"
  ON public.books FOR DELETE
  USING (public.is_authenticated_user_admin());

-- BOOK REQUESTS
CREATE POLICY "Users can view their own book requests"
  ON public.book_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own book requests"
  ON public.book_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending book requests"
  ON public.book_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'Pending');

CREATE POLICY "Users can delete their own pending book requests"
  ON public.book_requests FOR DELETE
  USING (auth.uid() = user_id AND status = 'Pending');

CREATE POLICY "Service role can do everything with book requests"
  ON public.book_requests TO service_role
  USING (true) WITH CHECK (true);

-- NEW: Admin policies for book requests
DROP POLICY IF EXISTS "Admins can view all book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Admins can update any book request" ON public.book_requests;
DROP POLICY IF EXISTS "Admins can delete any book request" ON public.book_requests;

CREATE POLICY "Admins can view all book requests"
  ON public.book_requests FOR SELECT
  USING (public.is_authenticated_user_admin());

CREATE POLICY "Admins can update any book request"
  ON public.book_requests FOR UPDATE
  USING (public.is_authenticated_user_admin());

CREATE POLICY "Admins can delete any book request"
  ON public.book_requests FOR DELETE
  USING (public.is_authenticated_user_admin());

-- DOWNLOAD LOGS
CREATE POLICY "Users can view their own download logs"
  ON public.download_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own download logs"
  ON public.download_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all download logs"
  ON public.download_logs FOR SELECT
  USING (public.is_authenticated_user_admin());

-- ACTIVITY LOGS
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_authenticated_user_admin());

-- IP LOGS
CREATE POLICY "Users can view their own IP logs"
  ON public.ip_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own IP logs"
  ON public.ip_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all IP logs"
  ON public.ip_logs FOR SELECT
  USING (public.is_authenticated_user_admin());

-- End of migration
