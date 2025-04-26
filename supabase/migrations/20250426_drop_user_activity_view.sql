-- Migration: Drop legacy user_activity_view to resolve Supabase security errors
-- This will NOT affect any current logic, as your app and admin dashboard do NOT use this view.
-- Safe to run.

DROP VIEW IF EXISTS public.user_activity_view;
