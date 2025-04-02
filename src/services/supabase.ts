import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Check if Supabase is configured
const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Log warning if environment variables are missing
if (!isSupabaseConfigured) {
  console.warn('⚠️ Missing Supabase environment variables. App will run with limited functionality.');
}

// Create Supabase client only if properly configured
export const supabase = isSupabaseConfigured 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Helper functions for authentication
export const signUp = async (email: string, password: string) => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Cannot sign up: Supabase not configured');
    return { data: { user: null }, error: { message: 'Supabase not configured' } };
  }
  return await supabase.auth.signUp({ email, password });
};

export const signIn = async (email: string, password: string) => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Cannot sign in: Supabase not configured');
    return { data: { user: null, session: null }, error: { message: 'Supabase not configured' } };
  }
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Cannot sign out: Supabase not configured');
    return { error: null };
  }
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { user: null } };
  }
  return await supabase.auth.getUser();
};

export const getSession = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { session: null } };
  }
  return await supabase.auth.getSession();
};
