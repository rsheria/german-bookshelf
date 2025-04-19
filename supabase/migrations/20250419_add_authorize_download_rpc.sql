-- Migration: Create authorize_download RPC for quota enforcement
BEGIN;

-- Authorize download: checks daily_quota, inserts log, returns download URL
CREATE OR REPLACE FUNCTION public.authorize_download(
  user_id uuid,
  book_id uuid
) RETURNS text AS $$
DECLARE
  used_count integer;
  limit integer;
  url text;
BEGIN
  SELECT daily_quota INTO limit FROM public.profiles WHERE id = user_id;
  SELECT count(*) INTO used_count
    FROM public.download_logs
    WHERE user_id = user_id
      AND downloaded_at >= date_trunc('day', now());
  IF used_count >= limit THEN
    RAISE EXCEPTION 'Download limit reached for today';
  END IF;
  INSERT INTO public.download_logs(user_id, book_id)
    VALUES (user_id, book_id);
  SELECT coalesce(download_url, file_url) INTO url
    FROM public.books WHERE id = book_id;
  RETURN url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
