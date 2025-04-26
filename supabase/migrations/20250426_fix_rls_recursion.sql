-- Migration: Fix RLS infinite recursion by using a helper function
-- Generated on 2025-04-26

CREATE OR REPLACE FUNCTION public.is_authenticated_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
-- Important: Set the search_path to prevent hijacking by users setting their own search_path
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_authenticated_user_admin() TO authenticated;
