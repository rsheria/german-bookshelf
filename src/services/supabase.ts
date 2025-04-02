import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'placeholder-key';

// Log warning instead of crashing the app
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Missing Supabase environment variables. App will run with limited functionality.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper functions for authentication
export const signUp = async (email: string, password: string) => {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    console.warn('Cannot sign up: Supabase not configured');
    return { data: { user: null }, error: { message: 'Supabase not configured' } };
  }
  return await supabase.auth.signUp({ email, password });
};

export const signIn = async (email: string, password: string) => {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    console.warn('Cannot sign in: Supabase not configured');
    return { data: { user: null, session: null }, error: { message: 'Supabase not configured' } };
  }
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    console.warn('Cannot sign out: Supabase not configured');
    return { error: null };
  }
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    return { data: { user: null } };
  }
  return await supabase.auth.getUser();
};

export const getSession = async () => {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    return { data: { session: null } };
  }
  return await supabase.auth.getSession();
};
