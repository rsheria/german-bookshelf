-- Migration: Add subscription stats RPC
BEGIN;

-- Returns counts of free vs premium users and total referrals
CREATE OR REPLACE FUNCTION public.get_subscription_stats()
RETURNS TABLE(
  free_count integer,
  premium_count integer,
  total_referrals integer
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE subscription_plan = 'free') AS free_count,
    COUNT(*) FILTER (WHERE subscription_plan = 'premium') AS premium_count,
    COALESCE(SUM(referrals_count), 0) AS total_referrals
  FROM public.profiles;
END;
$$;

COMMIT;
