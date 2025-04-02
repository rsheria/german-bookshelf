import { supabase } from '../services/supabase';

/**
 * Helper function to safely get the Supabase client and handle null cases
 * @returns The Supabase client or throws an error if not initialized
 */
export const getSupabaseClient = () => {
  try {
    if (!supabase) {
      console.warn('Supabase client is not initialized');
      throw new Error('Supabase client is not initialized');
    }
    return supabase;
  } catch (error) {
    console.error('Error getting Supabase client:', error);
    throw error;
  }
};

/**
 * Check if Supabase is properly configured
 * @returns boolean indicating if Supabase is configured
 */
export const isSupabaseConfigured = () => {
  try {
    return !!supabase;
  } catch (error) {
    return false;
  }
};
