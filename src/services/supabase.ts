import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
let supabaseClient: SupabaseClient<Database> | null = null;

// Export the client creation with simplified error handling
export const createSupabaseClient = () => {
  if (supabaseClient) return supabaseClient;
  
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Missing Supabase environment variables. Using mock data.');
      return null;
    }
    
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
};

// Initialize the client immediately for export
export const supabase = createSupabaseClient();

// Helper functions for authentication with error handling
export const signUp = async (email: string, password: string) => {
  try {
    const client = createSupabaseClient();
    if (!client) {
      console.warn('Cannot sign up: Supabase not configured');
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
      console.warn('Cannot sign in: Supabase not configured');
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
      console.warn('Cannot sign out: Supabase not configured');
      return { error: null };
    }
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
      console.warn('Cannot get user: Supabase not configured');
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
      console.warn('Cannot get session: Supabase not configured');
      return { data: { session: null } };
    }
    return await client.auth.getSession();
  } catch (error) {
    console.error('Get session error:', error);
    return { data: { session: null } };
  }
};
