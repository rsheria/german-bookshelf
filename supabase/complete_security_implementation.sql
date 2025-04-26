-- German Bookshelf Complete Security Implementation
-- Date: 2025-04-24
-- Apply this via Supabase Dashboard SQL Editor

-- PART 1: CREATE HELPER FUNCTIONS
-- Create efficient helper functions to reduce auth.uid() calls
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

-- PART 2: ENABLE RLS ON ALL TABLES
-- Automatically enables RLS on any table that doesn't have it
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

-- PART 3: BOOK REQUESTS SECURITY
-- Properly secure the book request system

-- Books table security
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "books_select_authenticated" ON public.books;
DROP POLICY IF EXISTS "books_admin_all" ON public.books;
DROP POLICY IF EXISTS "books_select_all" ON public.books;
DROP POLICY IF EXISTS "books_allow_admin_all" ON public.books;

-- Create proper policies for books
CREATE POLICY "books_select_authenticated" 
ON public.books FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "books_admin_all" 
ON public.books 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = get_current_user_id() AND profiles.is_admin = true
));

-- Book requests security
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
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

-- Drop policies separately first, adding extra error handling
DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "book_requests_select_authenticated" ON public.book_requests';
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "book_requests_insert_own" ON public.book_requests';
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "book_requests_update_own_pending" ON public.book_requests';
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "book_requests_delete_own_pending" ON public.book_requests';
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "book_requests_admin_all" ON public.book_requests';
    EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create comprehensive book request policies after confirmed drop
CREATE POLICY "book_requests_select_authenticated" 
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

-- PART 4: PROFILE AND USER SECURITY
-- Secure the profiles table

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_user_quota" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own avatar" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_basic" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- Create proper policies for profiles
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

-- PART 5: CATEGORIES SECURITY
-- Secure the categories table

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "cat_admin_all" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_authenticated" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_new" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated to create categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admins to update categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admins to delete categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;

-- Create proper policies for categories
CREATE POLICY "categories_select_all" 
ON public.categories FOR SELECT 
USING (true);

CREATE POLICY "categories_insert_authenticated" 
ON public.categories FOR INSERT 
WITH CHECK (get_current_user_id() IS NOT NULL);

CREATE POLICY "categories_admin_all" 
ON public.categories
USING (is_admin());

-- PART 6: ACTIVITY LOGS SECURITY
-- Secure the activity_logs table

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
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

-- Create proper policies for activity_logs
CREATE POLICY "activity_logs_select_own" 
ON public.activity_logs FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "activity_logs_insert_own" 
ON public.activity_logs FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "activity_logs_admin_all" 
ON public.activity_logs
USING (is_admin());

-- PART 7: BOOK RATINGS SECURITY
-- Secure the book_ratings table

ALTER TABLE public.book_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.book_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.book_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_user_crud" ON public.book_ratings;
DROP POLICY IF EXISTS "ratings_user_crud" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_select_all" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_insert_own" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_update_own" ON public.book_ratings;
DROP POLICY IF EXISTS "book_ratings_delete_own" ON public.book_ratings;

-- Create proper policies for book_ratings
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

-- PART 8: DOWNLOADS SECURITY
-- Secure the downloads table

ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own downloads" ON public.downloads;
DROP POLICY IF EXISTS "Users can view their own downloads" ON public.downloads;
DROP POLICY IF EXISTS "downloads_user" ON public.downloads;
DROP POLICY IF EXISTS "downloads_user_crud" ON public.downloads;
DROP POLICY IF EXISTS "downloads_select_own" ON public.downloads;
DROP POLICY IF EXISTS "downloads_insert_own" ON public.downloads;
DROP POLICY IF EXISTS "downloads_admin_all" ON public.downloads;

-- Create proper policies for downloads
CREATE POLICY "downloads_select_own" 
ON public.downloads FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "downloads_insert_own" 
ON public.downloads FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "downloads_admin_all" 
ON public.downloads
USING (is_admin());

-- PART 9: DOWNLOAD LOGS SECURITY
-- Secure the download_logs table

ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "dl_user_crud" ON public.download_logs;
DROP POLICY IF EXISTS "dl_user_insert" ON public.download_logs;
DROP POLICY IF EXISTS "dl_user_read" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_user_insert" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_user_read" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_select_own" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_insert_own" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_admin_all" ON public.download_logs;
DROP POLICY IF EXISTS "download_logs_user_crud" ON public.download_logs;

-- Create proper policies for download_logs
CREATE POLICY "download_logs_select_own" 
ON public.download_logs FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "download_logs_insert_own" 
ON public.download_logs FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "download_logs_admin_all" 
ON public.download_logs
USING (is_admin());

-- PART 10: SECURE ALL REMAINING TABLES

-- User sessions table
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_sessions_user_crud" ON public.user_sessions;
DROP POLICY IF EXISTS "us_self" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_self" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_admin_all" ON public.user_sessions;

-- Create proper policies for user_sessions
CREATE POLICY "user_sessions_select_own" 
ON public.user_sessions FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "user_sessions_admin_all" 
ON public.user_sessions
USING (is_admin());

-- User bans table
ALTER TABLE IF EXISTS public.user_bans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_bans_user_crud" ON public.user_bans;
DROP POLICY IF EXISTS "ub_self_read" ON public.user_bans;
DROP POLICY IF EXISTS "user_bans_select_own" ON public.user_bans;
DROP POLICY IF EXISTS "user_bans_admin_all" ON public.user_bans;

-- Create proper policies for user_bans
CREATE POLICY "user_bans_select_own" 
ON public.user_bans FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "user_bans_admin_all" 
ON public.user_bans
USING (is_admin());

-- Request votes table
ALTER TABLE IF EXISTS public.request_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "request_votes_user_crud" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_select_all" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_insert_own" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_update_own" ON public.request_votes;
DROP POLICY IF EXISTS "request_votes_delete_own" ON public.request_votes;

-- Create proper policies for request_votes
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

-- IP logs table
ALTER TABLE IF EXISTS public.ip_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "ip_logs_user_crud" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_user_crud" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_select_own" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_insert_own" ON public.ip_logs;
DROP POLICY IF EXISTS "ip_logs_admin_all" ON public.ip_logs;

-- Create proper policies for ip_logs
CREATE POLICY "ip_logs_select_own" 
ON public.ip_logs FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "ip_logs_insert_own" 
ON public.ip_logs FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "ip_logs_admin_all" 
ON public.ip_logs
USING (is_admin());

-- PART 11: STORAGE SECURITY

-- Storage buckets
ALTER TABLE IF EXISTS storage.buckets ENABLE ROW LEVEL SECURITY;

-- Policy allowing authenticated users to select from storage buckets
DROP POLICY IF EXISTS "buckets_select_authenticated" ON storage.buckets;
CREATE POLICY "buckets_select_authenticated" 
ON storage.buckets FOR SELECT 
USING (auth.role() = 'authenticated');

-- Storage objects
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow users to select from storage buckets (for avatars, book covers)
DROP POLICY IF EXISTS "objects_select_authenticated" ON storage.objects;
CREATE POLICY "objects_select_authenticated" 
ON storage.objects FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to upload their own avatar
DROP POLICY IF EXISTS "avatar_insert_own" ON storage.objects;
CREATE POLICY "avatar_insert_own" 
ON storage.objects FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  bucket_id = 'avatars' AND 
  (storage.filename(name) LIKE (auth.uid() || '%'))
);

-- Admins can manage all storage objects
DROP POLICY IF EXISTS "storage_admin_all" ON storage.objects;
CREATE POLICY "storage_admin_all" 
ON storage.objects 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- PART 12: SESSION MANAGEMENT IMPROVEMENTS
-- Create robust session management for login/logout

-- Only create if it doesn't exist
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, refresh_token_hash)
);

-- Enable RLS on sessions table
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Users can see their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.active_sessions FOR SELECT 
USING (user_id = auth.uid());

-- Create helper function for token verification (for enhanced security)
CREATE OR REPLACE FUNCTION verify_session_token(
  p_user_id UUID,
  p_token_hash TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.active_sessions
    WHERE user_id = p_user_id 
    AND refresh_token_hash = p_token_hash
    AND expires_at > NOW()
  );
END;
$$;

-- Function to handle login/logout events
CREATE OR REPLACE FUNCTION handle_auth_event()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.type = 'signup') THEN
    -- Create initial profile
    INSERT INTO public.profiles (id, email, created_at, last_active)
    VALUES (NEW.auth_id, NEW.email, NOW(), NOW());
    
  ELSIF (TG_OP = 'INSERT' AND NEW.type = 'login') THEN
    -- Update last active timestamp
    UPDATE public.profiles 
    SET last_active = NOW()
    WHERE id = NEW.auth_id;
    
    -- Record activity
    INSERT INTO public.activity_logs 
    (user_id, action, details, ip_address)
    VALUES 
    (NEW.auth_id, 'login', json_build_object('method', COALESCE(NEW.details->>'provider', 'email')), 
     COALESCE(NEW.ip::inet, '0.0.0.0'::inet));
    
  ELSIF (TG_OP = 'INSERT' AND NEW.type = 'logout') THEN
    -- Clear sessions for this user
    DELETE FROM public.active_sessions
    WHERE user_id = NEW.auth_id;
    
    -- Record activity
    INSERT INTO public.activity_logs 
    (user_id, action, details, ip_address)
    VALUES 
    (NEW.auth_id, 'logout', '{}'::jsonb,
     COALESCE(NEW.ip::inet, '0.0.0.0'::inet));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Use auth hooks instead of direct triggers for newer Supabase versions
-- This function will be called by Supabase Edge Functions or client-side code
-- when authentication events occur

-- Create a secure function to be called on auth events
CREATE OR REPLACE FUNCTION handle_auth_event_secure(
  event_type TEXT,
  user_id UUID,
  email TEXT DEFAULT NULL,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF event_type = 'signup' THEN
    -- Create initial profile
    INSERT INTO public.profiles (id, email, created_at, last_active)
    VALUES (user_id, email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
  ELSIF event_type = 'login' THEN
    -- Update last active timestamp
    UPDATE public.profiles 
    SET last_active = NOW()
    WHERE id = user_id;
    
    -- Record activity
    INSERT INTO public.activity_logs 
    (user_id, action, details, ip_address)
    VALUES 
    (user_id, 'login', '{}'::jsonb, ip_address);
    
  ELSIF event_type = 'logout' THEN
    -- Clear sessions for this user
    DELETE FROM public.active_sessions
    WHERE user_id = user_id;
    
    -- Record activity
    INSERT INTO public.activity_logs 
    (user_id, action, details, ip_address)
    VALUES 
    (user_id, 'logout', '{}'::jsonb, ip_address);
  END IF;
END;
$$;
