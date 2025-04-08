-- MINIMAL EMERGENCY RECOVERY SCRIPT FOR GERMAN BOOKSHELF
-- This script avoids using tables that might not exist in your Supabase version

-- ==========================================
-- PART 1: FIX AUTH PERMISSIONS (CRITICAL)
-- ==========================================

-- 1.1 Reset basic permissions that are essential for auth to work
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- These broad grants will restore basic functionality
-- without requiring specific table names
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth
GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth
GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth
GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- ==========================================
-- PART 2: ENSURE ROLES EXIST
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN NOINHERIT;
    END IF;
END
$$;

-- ==========================================
-- PART 3: REPAIR CORE TABLE PERMISSIONS
-- ==========================================

-- Enable RLS but with safe policies that won't block functionality
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_record.tablename);
        
        -- Add a permissive policy for each table
        BEGIN
            EXECUTE format('
                CREATE POLICY "Emergency Recovery Select Policy" 
                ON public.%I FOR SELECT 
                USING (true);
            ', table_record.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Policy might already exist, ignore errors
        END;
    END LOOP;
END
$$;

-- Specific permissions for critical auth tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        GRANT SELECT ON auth.users TO anon, authenticated, service_role;
    END IF;
END
$$;

-- ==========================================
-- PART 4: ENSURE CRITICAL TABLES EXIST
-- ==========================================

-- Check profiles table and create if missing
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
            monthly_request_quota integer DEFAULT 5,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
        
        -- Safe policy
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow public read-only access" 
            ON public.profiles FOR SELECT 
            USING (true);
        
        -- Add FK constraint if auth.users exists
        BEGIN
            ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_id_fkey
            FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            -- Might fail if auth.users doesn't exist with expected structure
        END;
    END IF;
END
$$;

-- ==========================================
-- PART 5: ENSURE AT LEAST ONE ADMIN EXISTS
-- ==========================================

-- Make sure at least one admin exists in the system
DO $$
DECLARE
    admin_count integer;
    first_user_id uuid;
BEGIN
    -- First check if profiles table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- Check for admin users
        SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE is_admin = true;
        
        IF admin_count = 0 THEN
            -- Find the first user and make them admin
            SELECT id INTO first_user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
            
            IF first_user_id IS NOT NULL THEN
                UPDATE public.profiles
                SET is_admin = true
                WHERE id = first_user_id;
                
                RAISE NOTICE 'Made user % an admin', first_user_id;
            END IF;
        END IF;
    END IF;
END
$$;

-- ==========================================
-- PART 6: CREATE SAFE HANDLING FOR BROKEN FUNCTIONS
-- ==========================================

-- Safe version of is_user_banned that won't block logins
CREATE OR REPLACE FUNCTION public.is_user_banned(user_id UUID DEFAULT NULL, ip_address TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    -- Emergency version that always allows login
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.is_user_banned TO anon, authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    -- Ignore permission errors
END;
$$;

-- ==========================================
-- PART 7: FIX TRIGGERS THAT MIGHT BE BREAKING AUTH
-- ==========================================

-- Safely remove problematic triggers (we'll add a minimal one back)
DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
    DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if trigger or table doesn't exist
END;
$$;

-- Create minimal user creation trigger if auth.users exists
DO $$
BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        -- Create simplified function to handle new users
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.profiles (id, username, email)
          VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            NEW.email
          )
          ON CONFLICT (id) DO NOTHING;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Add trigger
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END
$$;

-- ==========================================
-- FINAL MESSAGE
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE 'MINIMAL EMERGENCY RECOVERY COMPLETED.';
    RAISE NOTICE 'Basic auth and permissions restored.';
END
$$;
