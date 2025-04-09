-- MANUAL USER INSERT WITHOUT LOOPS
-- This avoids the loop syntax issues by using direct inserts

-- Just re-create the get_online_users function
DROP FUNCTION IF EXISTS public.get_online_users();

CREATE FUNCTION public.get_online_users()
RETURNS TABLE (
  user_id uuid,
  username text,
  last_active timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (us.user_id)
    us.user_id,
    p.username,
    us.last_active_at as last_active
  FROM public.user_sessions us
  JOIN public.profiles p ON us.user_id = p.id
  WHERE 
    us.is_active = true AND
    us.last_active_at >= (now() - interval '15 minutes')
  ORDER BY us.user_id, us.last_active_at DESC;
$$;

-- Now run a direct manual insert to avoid loops
INSERT INTO public.user_sessions (
  user_id,
  session_id,
  started_at,
  last_active_at,
  is_active,
  ip_address,
  user_agent
)
SELECT 
  id as user_id,
  uuid_generate_v4() as session_id,
  NOW() - interval '30 minutes' as started_at,
  NOW() - interval '1 minute' as last_active_at,
  true as is_active,
  '127.0.0.1' as ip_address,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' as user_agent
FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_sessions 
  WHERE user_sessions.user_id = profiles.id AND is_active = true
)
LIMIT 5;

-- Also insert LOGIN activities directly
INSERT INTO public.activity_logs (
  entity_id,
  entity_type,
  action,
  details,
  ip_address,
  username,
  created_at
)
SELECT 
  id::text as entity_id,
  'user' as entity_type,
  'LOGIN' as action,
  '{}'::jsonb as details,
  '127.0.0.1' as ip_address,
  username,
  NOW() - interval '30 minutes' as created_at
FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1 FROM public.activity_logs 
  WHERE 
    entity_id = profiles.id::text AND 
    action = 'LOGIN' AND
    created_at >= NOW() - interval '1 hour'
)
LIMIT 5;
