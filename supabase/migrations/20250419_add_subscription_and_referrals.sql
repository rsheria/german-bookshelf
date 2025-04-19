-- Migration: Add subscription plan and referrals to your Supabase schema
BEGIN;

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referrals_count integer NOT NULL DEFAULT 0;

-- Create a function to auto-generate referral_code on insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := substring(md5(random()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Create referrals logging table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
