-- ONLY FIXES IP LOGS ISSUE
-- THIS IS THE ABSOLUTE MINIMUM CHANGE

-- Fix the IP logs table to allow null user_id
ALTER TABLE public.ip_logs ALTER COLUMN user_id DROP NOT NULL;
