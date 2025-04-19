-- Migration: Add avatar_url column to profiles table
BEGIN;

-- Add avatar_url if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMIT;
