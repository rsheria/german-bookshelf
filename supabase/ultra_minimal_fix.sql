-- ULTRA MINIMAL EMERGENCY RECOVERY SCRIPT FOR GERMAN BOOKSHELF
-- Simple commands only, no complex PL/pgSQL blocks

-- ==========================================
-- PART 1: BASIC PERMISSIONS RESET (ESSENTIAL)
-- ==========================================

-- Grant basic schema permissions (critical for auth to work)
GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant table permissions in public schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant function permissions in public schema
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant sequence permissions in public schema
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Try to grant permissions on auth schema (may fail if not allowed)
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;

-- ==========================================
-- PART 2: ENSURE ROLES EXIST
-- ==========================================

-- Create roles if they don't exist (one at a time to avoid errors)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN NOINHERIT;
    END IF;
END
$$;

-- ==========================================
-- PART 3: CREATE CRITICAL TABLES (IF MISSING)
-- ==========================================

-- Create profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        CREATE TABLE public.profiles (
            id uuid PRIMARY KEY,
            username text UNIQUE,
            email text,
            is_admin boolean DEFAULT false,
            daily_quota integer DEFAULT 5,
            created_at timestamp with time zone DEFAULT now()
        );
    END IF;
END
$$;

-- ==========================================
-- PART 4: FIX ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on profiles (if it exists)
DO $$
BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Add permissive policy to profiles table
DO $$
BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- Drop policy first to avoid errors
        DROP POLICY IF EXISTS "Allow public read-only access" ON public.profiles;
        
        -- Create permissive policy
        CREATE POLICY "Allow public read-only access" 
            ON public.profiles FOR SELECT 
            USING (true);
    END IF;
END
$$;

-- ==========================================
-- PART 5: SIMPLE is_user_banned FUNCTION
-- ==========================================

-- Replace potentially problematic function with simple version
CREATE OR REPLACE FUNCTION public.is_user_banned(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    -- Emergency version that always allows login
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple version with two parameters
CREATE OR REPLACE FUNCTION public.is_user_banned(user_id UUID, ip_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Emergency version that always allows login
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to both versions
GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID, TEXT) TO service_role;

-- ==========================================
-- PART 6: REMOVE PROBLEMATIC TRIGGERS
-- ==========================================

-- Drop problematic triggers if they exist (one by one to avoid errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
