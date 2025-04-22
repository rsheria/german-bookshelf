-- Migration: Fix overloaded track_page_view_with_ip signature
BEGIN;

-- Drop both existing overloads
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, uuid, text, text) CASCADE;

-- Recreate function with p_session_id as TEXT only
CREATE OR REPLACE FUNCTION public.track_page_view_with_ip(
  p_user_id uuid,
  p_page_path text,
  p_session_id text,
  p_ip_address text,
  p_user_agent text
) RETURNS void AS $$
BEGIN
  PERFORM public.update_user_last_active_with_ip(p_user_id, p_session_id, p_ip_address, p_user_agent);
  INSERT INTO public.activity_logs(
    user_id, username, action, entity_id, entity_type, entity_name, details, ip_address, user_agent, created_at
  )
    SELECT p_user_id, prof.username, 'page_view', NULL, NULL, NULL,
           jsonb_build_object('page', p_page_path), p_ip_address, p_user_agent, timezone('utc', now())
    FROM public.profiles prof
    WHERE prof.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Drop existing unique constraint (if any) and add new unique constraint
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS uq_page_view_per_minute;
ALTER TABLE public.activity_logs ADD CONSTRAINT uq_page_view_per_minute UNIQUE (user_id, action, page_name, created_minute);

COMMIT;
