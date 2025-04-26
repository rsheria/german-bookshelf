-- COMPLETE RESTORATION SCRIPT
-- This will restore everything to how it was before security changes

-- First, disable RLS to ensure we can make all changes
DO $$ 
DECLARE
  t record;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- Drop all the new functions we created that are causing problems
DROP FUNCTION IF EXISTS public.get_is_admin(uuid);
DROP FUNCTION IF EXISTS public.check_is_admin();
DROP FUNCTION IF EXISTS public.log_ip_safe(uuid, text, text);
DROP FUNCTION IF EXISTS public.record_ip_bypass(uuid, text, text);
DROP FUNCTION IF EXISTS public.is_admin_secure();
DROP FUNCTION IF EXISTS public.validate_jwt(text);
DROP FUNCTION IF EXISTS public.is_token_valid(text);

-- Restore the original ip_logs table structure
ALTER TABLE public.ip_logs DROP CONSTRAINT IF EXISTS ip_logs_user_id_fkey;

-- Fix the ip_logs table to allow null user_id (if that was your original design)
ALTER TABLE public.ip_logs ALTER COLUMN user_id DROP NOT NULL;

-- Drop conflicting policies and restore originals
DO $$ 
DECLARE
  t record;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_read_all" ON public.%I', t.tablename, t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_manage_all" ON public.%I', t.tablename, t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "open_read_%s" ON public.%I', t.tablename, t.tablename);
  END LOOP;
END $$;

-- Restore original policies for main tables
CREATE POLICY "Enable read access for all users" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow admins to update any profile" ON public.profiles
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Enable read access for all users" ON public.books
  FOR SELECT USING (true);

CREATE POLICY "Allow admins to manage books" ON public.books
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Restore original functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- Ensure all auth.* tables are properly set up
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;

-- Fix track_page_view_with_ip function
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, uuid, inet, text);

CREATE OR REPLACE FUNCTION public.track_page_view_with_ip(
  p_user_id UUID,
  p_page_path TEXT,
  p_session_id TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.user_sessions (
    user_id,
    page_path,
    session_id,
    ip_address,
    user_agent,
    created_at,
    updated_at,
    is_active
  ) VALUES (
    p_user_id,
    p_page_path,
    p_session_id::UUID,
    p_ip_address::INET,
    p_user_agent,
    NOW(),
    NOW(),
    TRUE
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL on error
    RETURN NULL;
END;
$$;

-- Re-enable all necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles, public.user_sessions, public.activity_logs TO authenticated;
GRANT INSERT ON public.ip_logs TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Re-enable RLS on all tables
DO $$ 
DECLARE
  t record;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
