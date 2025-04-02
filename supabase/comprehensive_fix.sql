-- Reset all policies to fix permission and relationship issues
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
DROP POLICY IF EXISTS "Public profiles access" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

-- Make sure foreign key constraints are correct (this might be causing the profile page issue)
-- First check if the constraints exist and drop them if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'download_logs_book_id_fkey' 
               AND table_name = 'download_logs') THEN
        ALTER TABLE download_logs DROP CONSTRAINT download_logs_book_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'download_logs_user_id_fkey' 
               AND table_name = 'download_logs') THEN
        ALTER TABLE download_logs DROP CONSTRAINT download_logs_user_id_fkey;
    END IF;
END
$$;

-- Add the foreign key constraints properly
ALTER TABLE download_logs 
  ADD CONSTRAINT download_logs_book_id_fkey 
  FOREIGN KEY (book_id) 
  REFERENCES books(id) 
  ON DELETE CASCADE;

ALTER TABLE download_logs 
  ADD CONSTRAINT download_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Make sure RLS is enabled on all tables
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Create a PUBLIC policy for profiles - this is critical for fixing the profile page issue
CREATE POLICY "Public profiles access" 
  ON profiles FOR SELECT 
  USING (true);

-- Create a policy to allow authenticated users to update any profile
CREATE POLICY "Authenticated users can update profiles" 
  ON profiles FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- PUBLIC Books policies (anyone can read)
CREATE POLICY "Anyone can read books"
  ON books FOR SELECT
  USING (true);

-- Admin book management policies
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

-- PUBLIC Download logs policies (this is critical for the profile page)
CREATE POLICY "Public download logs access"
  ON download_logs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own download logs"
  ON download_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix the trigger for creating profiles on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin, daily_quota)
  VALUES (NEW.id, NEW.email, FALSE, 3);
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

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_quota INTEGER DEFAULT 3;
    EXCEPTION
        WHEN duplicate_column THEN 
            -- Do nothing, column already exists
    END;
END $$;
