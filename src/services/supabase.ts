import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables directly on each import to ensure they're always loaded
const getSupabaseUrl = () => import.meta.env.VITE_SUPABASE_URL;
const getSupabaseAnonKey = () => import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a fresh Supabase client on each access
// This prevents stale clients after page refresh
export const createSupabaseClient = (): SupabaseClient<Database> | null => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Missing Supabase environment variables');
      return null;
    }

    // Create a fresh client instance each time
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'supabase.auth.token.v2'
      }
    });
    
    return client;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
};

// Get a client for direct use - will always be fresh
export const supabase = createSupabaseClient();

// Helper functions for authentication with error handling
export const signUp = async (email: string, password: string) => {
  try {
    const client = createSupabaseClient();
    if (!client) {
      return { data: { user: null }, error: { message: 'Supabase not configured' } };
    }
    return await client.auth.signUp({ email, password });
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: { user: null }, error: { message: 'Sign up failed' } };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const client = createSupabaseClient();
    if (!client) {
      return { data: { user: null, session: null }, error: { message: 'Supabase not configured' } };
    }
    return await client.auth.signInWithPassword({ email, password });
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: { user: null, session: null }, error: { message: 'Sign in failed' } };
  }
};

export const signOut = async () => {
  try {
    const client = createSupabaseClient();
    if (!client) {
      return { error: null };
    }
    // Clear browser storage when signing out to prevent stale data
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.token.v2');
    sessionStorage.clear();
    return await client.auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: { message: 'Sign out failed' } };
  }
};

export const getCurrentUser = async () => {
  try {
    const client = createSupabaseClient();
    if (!client) {
      return { data: { user: null } };
    }
    return await client.auth.getUser();
  } catch (error) {
    console.error('Get user error:', error);
    return { data: { user: null } };
  }
};

export const getSession = async () => {
  try {
    const client = createSupabaseClient();
    if (!client) {
      return { data: { session: null } };
    }
    return await client.auth.getSession();
  } catch (error) {
    console.error('Get session error:', error);
    return { data: { session: null } };
  }
};
