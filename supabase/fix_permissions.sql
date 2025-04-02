-- Reset all policies to fix permission issues
-- First, drop existing policies
DROP POLICY IF EXISTS "Anyone can read books" ON books;
DROP POLICY IF EXISTS "Only admins can insert books" ON books;
DROP POLICY IF EXISTS "Only admins can update books" ON books;
DROP POLICY IF EXISTS "Only admins can delete books" ON books;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own download logs" ON download_logs;
DROP POLICY IF EXISTS "Admins can read all download logs" ON download_logs;
DROP POLICY IF EXISTS "Users can insert their own download logs" ON download_logs;

-- Make sure RLS is enabled on all tables
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public access to the profiles table
-- This is important to fix the issue where changing admin status breaks the app
CREATE POLICY "Public profiles access" 
  ON profiles FOR SELECT 
  USING (true);

-- Create a policy to allow authenticated users to update any profile
-- This will allow admins to change the is_admin flag without breaking permissions
CREATE POLICY "Authenticated users can update profiles" 
  ON profiles FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Books policies (anyone can read, only admins can write)
CREATE POLICY "Anyone can read books"
  ON books FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert books"
  ON books FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update books"
  ON books FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete books"
  ON books FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Download logs policies
CREATE POLICY "Users can read their own download logs"
  ON download_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all download logs"
  ON download_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can insert their own download logs"
  ON download_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix the trigger for creating profiles on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (NEW.id, NEW.email, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE create_profile_for_user();

-- Grant necessary permissions to the anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure the auth schema is accessible
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON TABLE auth.users TO authenticated;

-- Fix any existing profiles that might be causing issues
UPDATE profiles
SET is_admin = TRUE
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'your-email@example.com' -- Replace with your actual email
);
