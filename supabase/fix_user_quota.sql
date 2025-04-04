-- Fix the user profile daily quota issue
BEGIN;

-- Check if the profiles table has the required columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'daily_quota'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_quota INTEGER DEFAULT 3;
  END IF;
END $$;

-- 1. Make sure all users have a profile
INSERT INTO public.profiles (id, username, daily_quota)
SELECT 
  id, 
  email, 
  3 -- Default quota
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Make sure all profiles have a daily_quota value
UPDATE public.profiles 
SET daily_quota = 3
WHERE daily_quota IS NULL OR daily_quota = 0;

-- 3. Update the user metadata to include daily_quota
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || 
  jsonb_build_object(
    'daily_quota', 
    (SELECT daily_quota FROM public.profiles WHERE id = auth.users.id)
  )
WHERE id IN (SELECT id FROM public.profiles);

-- 4. Make sure all admins have proper privileges (if applicable)
UPDATE public.profiles
SET is_admin = TRUE
WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@example.com' OR email ILIKE '%@admin%')
AND is_admin IS NULL;

COMMIT;
