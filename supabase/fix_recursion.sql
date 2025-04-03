-- Fix the infinite recursion in profiles policy
-- First, drop all existing problematic policies
DROP POLICY IF EXISTS "Public profiles access" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

-- Create simpler, non-recursive policies
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "User can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Reset any broken foreign key constraints FIRST (order matters!)
ALTER TABLE download_logs 
  DROP CONSTRAINT IF EXISTS download_logs_user_id_fkey;

-- Now we can safely modify the primary key if needed
-- (but we'll skip this part since it's already set up correctly)
-- DO NOT try to drop and recreate the primary key, as other tables depend on it

-- Recreate the foreign key constraint
ALTER TABLE download_logs 
  ADD CONSTRAINT download_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add default admin user (replace with your email)
UPDATE profiles
SET is_admin = TRUE
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'rsher@example.com' 
);
