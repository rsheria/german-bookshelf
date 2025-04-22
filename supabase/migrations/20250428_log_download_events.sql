-- Migration: Log download events to activity_logs via trigger
BEGIN;

-- Remove existing trigger/function if present
DROP TRIGGER IF EXISTS trigger_log_download ON public.download_logs;
DROP FUNCTION IF EXISTS public.trg_log_download() CASCADE;

-- Function to log download activity
CREATE OR REPLACE FUNCTION public.trg_log_download()
RETURNS trigger AS $$
BEGIN
  PERFORM public.log_user_activity_with_type(
    NEW.user_id,
    'DOWNLOAD',
    NEW.book_id::text,
    'book',
    (SELECT title FROM public.books WHERE id = NEW.book_id),
    NULL,
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on download_logs insert
CREATE TRIGGER trigger_log_download
AFTER INSERT ON public.download_logs
FOR EACH ROW
EXECUTE PROCEDURE public.trg_log_download();

COMMIT;
