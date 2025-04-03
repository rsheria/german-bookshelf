-- SIMPLIFIED RLS FIX FOR SESSION PERSISTENCE
-- This avoids syntax errors while still fixing the core issues

-- =========================================================
-- PART 1: DISABLE RLS COMPLETELY ON CRITICAL TABLES
-- =========================================================

-- Completely disable RLS on authentication and user tables
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on content tables to ensure they load properly after refresh
ALTER TABLE IF EXISTS public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.download_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.book_requests DISABLE ROW LEVEL SECURITY;

-- =========================================================
-- PART 2: ENSURE ALL ROLES HAVE FULL ACCESS TO PUBLIC TABLES
-- =========================================================

-- Grant very permissive access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- =========================================================
-- PART 3: CREATE MORE PERMISSIVE RLS POLICIES
-- =========================================================

-- Recreate profiles table policies to be more permissive
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to access own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;

-- Create new permissive policies
CREATE POLICY "Anyone can read any profile" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Make book table completely accessible
ALTER TABLE IF EXISTS public.books ENABLE ROW LEVEL SECURITY;

-- Drop existing book policies
DROP POLICY IF EXISTS "Allow public read access" ON public.books;
DROP POLICY IF EXISTS "Allow admin full access" ON public.books;

-- Create permissive book policies
CREATE POLICY "Anyone can read any book" 
ON public.books FOR SELECT 
USING (true);

CREATE POLICY "Admin users can modify books" 
ON public.books FOR ALL 
USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- =========================================================
-- PART 4: FIX PROFILE CREATION ISSUE
-- =========================================================

-- Create a trigger to handle duplicate profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin, daily_quota)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1), false, 3)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
