import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create production-ready Supabase client with optimal configuration
const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: localStorage
    }
  }
);

// Export the singleton client
export { supabase };

// Auth helper functions
export const signUp = async (email: string, password: string) => {
  try {
    return await supabase.auth.signUp({ email, password });
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: { user: null }, error: { message: 'Sign up failed' } };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const result = await supabase.auth.signInWithPassword({ email, password });
    return result;
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: { user: null, session: null }, error: { message: 'Sign in failed' } };
  }
};

export const signOut = async () => {
  try {
    return await supabase.auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: { message: 'Sign out failed' } };
  }
};

export const getSession = async () => {
  try {
    return await supabase.auth.getSession();
  } catch (error) {
    console.error('Get session error:', error);
    return { data: { session: null } };
  }
};

export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw error;
    }
    return { data, error: null };
  } catch (error) {
    console.error('Refresh session error:', error);
    return { data: null, error };
  }
};
