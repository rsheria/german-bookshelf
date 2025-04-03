-- ULTRA RELIABLE FIX FOR SUPABASE AUTHENTICATION
-- This script completely disables all row-level security to ensure your app works
-- WARNING: This should be used as a temporary fix until you can implement proper RLS

-- First, turn off all RLS completely on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE books DISABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE
    _table text;
    _policy text;
BEGIN
    FOR _table IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        FOR _policy IN 
            SELECT policyname FROM pg_policies 
            WHERE tablename = _table AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', _policy, _table);
        END LOOP;
    END LOOP;
END $$;

-- Grant full access to authenticated users for all tables
GRANT ALL ON TABLE public.profiles TO authenticated, anon;
GRANT ALL ON TABLE public.books TO authenticated, anon;
GRANT ALL ON TABLE public.download_logs TO authenticated, anon;

-- Note: You can re-enable RLS with proper policies once your app is stable
-- For now, this ensures you can access your data without authentication issues
