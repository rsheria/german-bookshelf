-- EXTREMELY MINIMAL FIX
-- Only focuses on dropping existing policies first

-- Drop all possible conflicting policies first
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "books_select_all" ON public.books;
DROP POLICY IF EXISTS "allow_ip_logs_operations" ON public.ip_logs;

-- Fix the IP logs table
ALTER TABLE public.ip_logs ALTER COLUMN user_id DROP NOT NULL;

-- Create minimal policies
CREATE POLICY "ip_logs_operations" ON public.ip_logs FOR ALL USING (true);
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "books_read" ON public.books FOR SELECT USING (true);
