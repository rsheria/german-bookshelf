-- Fix infinite recursion in RLS policies by using is_admin() helper function
-- Generated 2025-04-26

-- 1. Create or replace the is_admin() helper function
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

-- 2. Drop recursive admin policies on core tables
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert books" ON public.books;
DROP POLICY IF EXISTS "Only admins can update books" ON public.books;
DROP POLICY IF EXISTS "Only admins can delete books" ON public.books;
DROP POLICY IF EXISTS "Admins can view all download logs" ON public.download_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view all IP logs" ON public.ip_logs;
DROP POLICY IF EXISTS "Service role can do everything with book requests" ON public.book_requests;

-- 3. Recreate admin policies using is_admin()

-- PROFILES
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (is_admin());

-- BOOKS
CREATE POLICY "Only admins can insert books"
  ON public.books FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update books"
  ON public.books FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete books"
  ON public.books FOR DELETE
  USING (is_admin());

-- DOWNLOAD LOGS
CREATE POLICY "Admins can view all download logs"
  ON public.download_logs FOR SELECT
  USING (is_admin());

-- ACTIVITY LOGS
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (is_admin());

-- IP LOGS
CREATE POLICY "Admins can view all IP logs"
  ON public.ip_logs FOR SELECT
  USING (is_admin());

-- BOOK REQUESTS (service_role is admin-equivalent)
CREATE POLICY "Service role can do everything with book requests"
  ON public.book_requests TO service_role
  USING (true) WITH CHECK (true);

-- End of migration
