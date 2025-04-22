BEGIN;

-- Add a country_code column to store ISO country code for each IP log
ALTER TABLE public.ip_logs
ADD COLUMN IF NOT EXISTS country_code text;

COMMIT;
