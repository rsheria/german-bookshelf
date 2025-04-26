-- MINIMAL SQL CHANGES FOR FRONTEND APPROACH
-- This creates a policy to allow the admin to directly access last_active

BEGIN;

-- Ensure admins have full read access to profiles
DROP POLICY IF EXISTS "Admin has full access to profiles" ON public.profiles;
CREATE POLICY "Admin has full access to profiles" ON public.profiles
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

COMMIT;
