import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client with error handling
let supabaseClient;
try {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Using mock data.');
    throw new Error('Missing Supabase environment variables');
  }
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Create a dummy client that will be replaced with mock data in the hooks
  supabaseClient = null;
}

// Export the client
export const supabase = supabaseClient;

// Helper functions for authentication with error handling
export const signUp = async (email: string, password: string) => {
  try {
    if (!supabase) {
      console.warn('Cannot sign up: Supabase not configured');
      return { data: { user: null }, error: { message: 'Supabase not configured' } };
    }
    return await supabase.auth.signUp({ email, password });
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: { user: null }, error: { message: 'Sign up failed' } };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    if (!supabase) {
      console.warn('Cannot sign in: Supabase not configured');
      return { data: { user: null, session: null }, error: { message: 'Supabase not configured' } };
    }
    return await supabase.auth.signInWithPassword({ email, password });
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: { user: null, session: null }, error: { message: 'Sign in failed' } };
  }
};

export const signOut = async () => {
  try {
    if (!supabase) {
      console.warn('Cannot sign out: Supabase not configured');
      return { error: null };
    }
    return await supabase.auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: { message: 'Sign out failed' } };
  }
};

export const getCurrentUser = async () => {
  try {
    if (!supabase) {
      console.warn('Cannot get user: Supabase not configured');
      return { data: { user: null } };
    }
    return await supabase.auth.getUser();
  } catch (error) {
    console.error('Get user error:', error);
    return { data: { user: null } };
  }
};

export const getSession = async () => {
  try {
    if (!supabase) {
      console.warn('Cannot get session: Supabase not configured');
      return { data: { session: null } };
    }
    return await supabase.auth.getSession();
  } catch (error) {
    console.error('Get session error:', error);
    return { data: { session: null } };
  }
};
