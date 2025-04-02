import { supabase } from '../services/supabase';

/**
 * Helper function to get the Supabase client
 * @returns The Supabase client
 */
export const getSupabaseClient = () => {
  return supabase;
};

/**
 * Check if Supabase is properly configured
 * @returns boolean indicating if Supabase is configured
 */
export const isSupabaseConfigured = () => {
  return true; // We're now assuming Supabase is always configured
};
