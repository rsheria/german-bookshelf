-- EMERGENCY FIX FOR DOWNLOAD PERMISSIONS
-- This script fixes the Row Level Security issue preventing downloads

-- First, disable RLS temporarily to allow admin operations
ALTER TABLE download_logs DISABLE ROW LEVEL SECURITY;

-- DROP ALL existing policies on download_logs
DROP POLICY IF EXISTS "Users can view their own download logs" ON download_logs;
DROP POLICY IF EXISTS "Users can create their own download logs" ON download_logs;
DROP POLICY IF EXISTS "Users can add their own download logs" ON download_logs;
DROP POLICY IF EXISTS "Users can view download logs" ON download_logs;
DROP POLICY IF EXISTS "download_logs_select_policy" ON download_logs;
DROP POLICY IF EXISTS "download_logs_insert_policy" ON download_logs;
DROP POLICY IF EXISTS "download_logs_delete_policy" ON download_logs;

-- Now recreate the policies with proper permissions

-- SELECT policy - users can view their own download logs
CREATE POLICY "download_logs_select" 
ON download_logs FOR SELECT 
USING (auth.uid() = user_id);

-- INSERT policy - users can create their own download logs
CREATE POLICY "download_logs_insert" 
ON download_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy - users can update their own download logs (if needed)
CREATE POLICY "download_logs_update" 
ON download_logs FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE policy - users can delete their own download logs (if needed)
CREATE POLICY "download_logs_delete" 
ON download_logs FOR DELETE
USING (auth.uid() = user_id);

-- Re-enable RLS with our new policies
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Make sure the profiles table is also properly configured
DROP POLICY IF EXISTS "profiles_read_access" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_access" ON profiles;
DROP POLICY IF EXISTS "profiles_update_access" ON profiles;

-- Create proper profile policies
CREATE POLICY "profiles_read_access" ON profiles
FOR SELECT USING (true);  -- Anyone can read profiles

CREATE POLICY "profiles_insert_access" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);  -- Users can insert their own profile

CREATE POLICY "profiles_update_access" ON profiles
FOR UPDATE USING (auth.uid() = id);  -- Users can update their own profile

-- Make sure authorized users can access these tables
GRANT ALL ON TABLE download_logs TO authenticated;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE books TO authenticated;

-- Additional fix: ensure the download function has proper permissions
-- Allow the service role to access these tables 
GRANT ALL ON TABLE download_logs TO service_role;
GRANT ALL ON TABLE profiles TO service_role;
GRANT ALL ON TABLE books TO service_role;

-- Grant anonymous users read access to essential tables
GRANT SELECT ON TABLE books TO anon;
GRANT SELECT ON TABLE profiles TO anon;

-- CRITICAL FIX: Make sure roles can use the auth.uid() function
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO service_role;
