-- Fix user quota update functionality
-- This script ensures that quota updates from the admin panel work properly

-- 1. Create or replace a function to update user quotas
CREATE OR REPLACE FUNCTION public.update_user_quota(
  p_user_id UUID,
  p_daily_quota INTEGER,
  p_monthly_request_quota INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Update the user's quotas in the profiles table
  UPDATE public.profiles
  SET 
    daily_quota = p_daily_quota,
    monthly_request_quota = p_monthly_request_quota,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Check if the update was successful
  IF FOUND THEN
    success := TRUE;
    
    -- Log the quota update activity
    BEGIN
      PERFORM public.log_user_activity(
        auth.uid(),
        'ADMIN_ACTION',
        p_user_id,
        'user',
        (SELECT username FROM public.profiles WHERE id = p_user_id),
        jsonb_build_object(
          'action', 'update_quota',
          'daily_quota', p_daily_quota,
          'monthly_request_quota', p_monthly_request_quota
        ),
        NULL
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error logging quota update activity: %', SQLERRM;
    END;
  END IF;
  
  RETURN success;
END;
$$;

-- 2. Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION public.update_user_quota TO authenticated;

-- 3. Create a policy to allow admins to update user quotas
CREATE POLICY IF NOT EXISTS admin_update_user_quota
  ON public.profiles
  FOR UPDATE
  USING (
    -- Allow admins to update any user profile
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
  );

-- 4. Ensure the RLS is enabled on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Make sure the profiles table schema is correct for the quotas
DO $$
BEGIN
  -- Add daily_quota column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'daily_quota'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN daily_quota INTEGER DEFAULT 5 NOT NULL;
  END IF;

  -- Add monthly_request_quota column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'monthly_request_quota'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN monthly_request_quota INTEGER DEFAULT 10 NOT NULL;
  END IF;
END
$$;
