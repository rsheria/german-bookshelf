-- Create user_sessions table for tracking online users
DROP FUNCTION IF EXISTS public.end_user_session_with_ip(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.end_user_session(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_last_active_with_ip(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_last_active(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.track_page_view_with_ip(uuid, text, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.track_page_view(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_online_users() CASCADE;

-- Create user_sessions table for tracking online users
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id text UNIQUE NOT NULL,
  ip_address text,
  user_agent text,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_active_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ended_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

-- RPC: update_user_last_active_with_ip
CREATE OR REPLACE FUNCTION public.update_user_last_active_with_ip(
  p_user_id uuid,
  p_session_id text,
  p_ip_address text,
  p_user_agent text
) RETURNS void AS $$
BEGIN
  INSERT INTO public.user_sessions(user_id, session_id, ip_address, user_agent, started_at, last_active_at, is_active)
  VALUES (p_user_id, p_session_id, p_ip_address, p_user_agent, timezone('utc', now()), timezone('utc', now()), true)
  ON CONFLICT (session_id) DO UPDATE
    SET last_active_at = timezone('utc', now()),
        ip_address = p_ip_address,
        user_agent = p_user_agent,
        is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: update_user_last_active (fallback)
CREATE OR REPLACE FUNCTION public.update_user_last_active(
  p_user_id uuid,
  p_session_id text
) RETURNS void AS $$
BEGIN
  PERFORM public.update_user_last_active_with_ip(p_user_id, p_session_id, NULL, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: end_user_session_with_ip
CREATE OR REPLACE FUNCTION public.end_user_session_with_ip(
  p_user_id uuid,
  p_session_id text,
  p_ip_address text,
  p_user_agent text
) RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
    SET ended_at = timezone('utc', now()),
        is_active = false,
        ip_address = COALESCE(p_ip_address, ip_address),
        user_agent = COALESCE(p_user_agent, user_agent)
  WHERE session_id = p_session_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: end_user_session (fallback)
CREATE OR REPLACE FUNCTION public.end_user_session(
  p_user_id uuid,
  p_session_id text
) RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
    SET ended_at = timezone('utc', now()),
        is_active = false
  WHERE session_id = p_session_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: track_page_view_with_ip
CREATE OR REPLACE FUNCTION public.track_page_view_with_ip(
  p_user_id uuid,
  p_page_path text,
  p_session_id uuid,
  p_ip_address text,
  p_user_agent text
) RETURNS void AS $$
BEGIN
  PERFORM public.update_user_last_active_with_ip(p_user_id, p_session_id::text, p_ip_address, p_user_agent);
  INSERT INTO public.activity_logs(user_id, username, action, entity_id, entity_type, entity_name, details, ip_address, user_agent, created_at)
    SELECT p_user_id, prof.username, 'page_view', NULL, NULL, NULL,
           jsonb_build_object('page', p_page_path), p_ip_address, p_user_agent, timezone('utc', now())
    FROM public.profiles prof
    WHERE prof.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: track_page_view (fallback)
CREATE OR REPLACE FUNCTION public.track_page_view(
  p_user_id uuid,
  p_page_path text,
  p_session_id text
) RETURNS void AS $$
BEGIN
  PERFORM public.update_user_last_active(p_user_id, p_session_id);
  INSERT INTO public.activity_logs(user_id, username, action, details, created_at)
    SELECT p_user_id, prof.username, 'page_view', jsonb_build_object('page', p_page_path), timezone('utc', now())
    FROM public.profiles prof
    WHERE prof.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_online_users
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (user_id uuid, username text, last_active timestamptz) AS $$
BEGIN
  RETURN QUERY
    SELECT
      s.user_id,
      prof.username,
      MAX(s.last_active_at) AS last_active
    FROM public.user_sessions s
    JOIN public.profiles prof ON prof.id = s.user_id
    WHERE s.is_active = TRUE
      AND s.last_active_at >= timezone('utc', now()) - interval '15 minutes'
    GROUP BY s.user_id, prof.username
    ORDER BY last_active DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
