-- Migration: Fix return types in get_subscription_stats RPC
BEGIN;

-- Recreate the function with proper integer casts
CREATE OR REPLACE FUNCTION public.get_subscription_stats()
RETURNS TABLE(
  free_count integer,
  premium_count integer,
  total_referrals integer
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE subscription_plan = 'free')::integer AS free_count,
    COUNT(*) FILTER (WHERE subscription_plan = 'premium')::integer AS premium_count,
    COALESCE(SUM(referrals_count), 0)::integer AS total_referrals
  FROM public.profiles;
END;
$$;

COMMIT;
