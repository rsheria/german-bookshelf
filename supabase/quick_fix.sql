-- EMERGENCY FIX FOR INFINITE RECURSION
-- Run this in your Supabase SQL Editor immediately

-- First, completely drop ALL policies on the profiles table
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

-- Create ONE simple policy for reading profiles
CREATE POLICY "Simple profile read access"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Create ONE simple policy for creating own profile
CREATE POLICY "Simple profile insert policy"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create ONE simple policy for updating own profile
CREATE POLICY "Simple profile update policy"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Reset permissions
GRANT ALL ON TABLE public.profiles TO postgres;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
