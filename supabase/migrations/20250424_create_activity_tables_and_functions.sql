-- Create activity_logs table and RPC functions for user activity tracking
BEGIN;

-- Table for activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text,
  action text NOT NULL,
  entity_id text,
  entity_type text,
  entity_name text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Index on user_id
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);

-- RPC: log_user_activity_with_type
CREATE OR REPLACE FUNCTION public.log_user_activity_with_type(
  p_user_id uuid,
  p_action text,
  p_entity_id text,
  p_entity_type text,
  p_entity_name text,
  p_details text,
  p_ip_address text,
  p_user_agent text
) RETURNS uuid AS $$
  INSERT INTO public.activity_logs(
    user_id, action, entity_id, entity_type, entity_name, details, ip_address, user_agent
  ) VALUES (
    p_user_id, p_action, p_entity_id, p_entity_type, p_entity_name,
    CASE WHEN p_details IS NOT NULL THEN p_details::jsonb ELSE NULL END,
    p_ip_address, p_user_agent
  ) RETURNING id;
$$ LANGUAGE SQL VOLATILE SECURITY DEFINER;

-- RPC: log_user_activity (fallback)
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid,
  p_action text,
  p_entity_id text,
  p_entity_type text,
  p_entity_name text,
  p_details text,
  p_ip_address text
) RETURNS uuid AS $$
  INSERT INTO public.activity_logs(
    user_id, action, entity_id, entity_type, entity_name, details, ip_address
  ) VALUES (
    p_user_id, p_action, p_entity_id, p_entity_type, p_entity_name,
    CASE WHEN p_details IS NOT NULL THEN p_details::jsonb ELSE NULL END,
    p_ip_address
  ) RETURNING id;
$$ LANGUAGE SQL VOLATILE SECURITY DEFINER;

-- RPC: get_recent_activity
DROP FUNCTION IF EXISTS public.get_recent_activity(integer);
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count integer)
RETURNS SETOF public.activity_logs AS $$
  SELECT * FROM public.activity_logs
  ORDER BY created_at DESC
  LIMIT limit_count;
$$ LANGUAGE SQL VOLATILE SECURITY DEFINER;

-- RPC: get_activity_stats
DROP FUNCTION IF EXISTS public.get_activity_stats();
CREATE OR REPLACE FUNCTION public.get_activity_stats()
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'today', COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())),
    'week', COUNT(*) FILTER (WHERE created_at >= date_trunc('week', now())),
    'month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())),
    'byAction', (
      SELECT jsonb_object_agg(action, cnt)
      FROM (
        SELECT action, COUNT(*) AS cnt
        FROM public.activity_logs
        GROUP BY action
      ) AS counts
    )
  ) FROM public.activity_logs;
$$ LANGUAGE SQL VOLATILE SECURITY DEFINER;

-- RPC: get_user_login_history
DROP FUNCTION IF EXISTS public.get_user_login_history(integer);
CREATE OR REPLACE FUNCTION public.get_user_login_history(limit_count integer)
RETURNS SETOF public.activity_logs AS $$
  SELECT * FROM public.activity_logs
  WHERE action = 'LOGIN'
  ORDER BY created_at DESC
  LIMIT limit_count;
$$ LANGUAGE SQL VOLATILE SECURITY DEFINER;

-- Auto-trigger: log LOGIN events on new sessions
CREATE OR REPLACE FUNCTION public.trg_log_user_login()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.activity_logs(user_id, action, created_at)
  VALUES (NEW.user_id, 'LOGIN', COALESCE(NEW.started_at, timezone('utc', now())));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_user_login
AFTER INSERT ON public.user_sessions
FOR EACH ROW
EXECUTE PROCEDURE public.trg_log_user_login();

COMMIT;
