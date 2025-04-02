import { supabase } from '../services/supabase';

/**
 * Helper function to safely get the Supabase client
 * @returns The Supabase client or null if not initialized
 */
export const getSupabaseClient = () => {
  return supabase; // This can be null, but we'll handle it in the components
};

/**
 * Check if Supabase is properly configured
 * @returns boolean indicating if Supabase is configured
 */
export const isSupabaseConfigured = () => {
  return !!supabase;
};
