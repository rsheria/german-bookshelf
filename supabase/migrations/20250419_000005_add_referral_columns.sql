-- Enable extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add referral columns to profiles table
-- Add referred_by column if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- Add referral_code column if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code uuid NOT NULL DEFAULT uuid_generate_v4();
