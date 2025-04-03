-- EMERGENCY COMPLETE FIX FOR INFINITE RECURSION
-- Run this in your Supabase SQL Editor immediately
-- This script removes ALL policies and then creates only the absolute minimum needed

-- First, turn off RLS while we're fixing things
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE books DISABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies from ALL tables that might be causing issues
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "User can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Public profiles access" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON profiles;
DROP POLICY IF EXISTS "Simple profile read access" ON profiles;
DROP POLICY IF EXISTS "Simple profile insert policy" ON profiles;
DROP POLICY IF EXISTS "Simple profile update policy" ON profiles;

-- Also drop any policies on download_logs that might be causing issues
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON download_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON download_logs;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON download_logs;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON download_logs;
DROP POLICY IF EXISTS "Users can view their own download logs" ON download_logs;
DROP POLICY IF EXISTS "Admins can view all download logs" ON download_logs;
DROP POLICY IF EXISTS "Users can create their own download logs" ON download_logs;

-- Create the absolute bare minimum policies for profiles
-- PROFILE POLICIES
-- 1. Anyone can read profiles (no conditions, just true)
CREATE POLICY "open_read_profiles"
  ON profiles FOR SELECT
  USING (true);

-- 2. Only the user can update their own profile
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Allow user to insert their own profile
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- DOWNLOAD LOGS POLICIES
-- 1. Simple read policy for download logs
CREATE POLICY "read_own_logs"
  ON download_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Simple create policy for download logs
CREATE POLICY "create_own_logs"
  ON download_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Make sure foreign key constraints are correct
ALTER TABLE download_logs 
  DROP CONSTRAINT IF EXISTS download_logs_user_id_fkey;

ALTER TABLE download_logs 
  ADD CONSTRAINT download_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Re-enable RLS protection
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions
GRANT ALL ON TABLE public.profiles TO postgres;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.books TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.download_logs TO authenticated;
