import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a persistent Supabase client with optimal configuration
const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Use localStorage instead of cookies to ensure persistence across refreshes
      storageKey: 'supabase.auth.token',
      storage: localStorage
    },
    // Add global error handling
    global: {
      fetch: (...args) => {
        return fetch(...args).catch(err => {
          console.error('Network error in Supabase client:', err);
          // Don't throw, just return a blank response to prevent app crashes
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      }
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
    // Force save the session in localStorage as a fallback
    if (result.data.session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(result.data.session));
    }
    return result;
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: { user: null, session: null }, error: { message: 'Sign in failed' } };
  }
};

export const signOut = async () => {
  try {
    // Clear all storage explicitly before sign out
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.token.v2');
    localStorage.removeItem('sb-refresh-token');
    localStorage.removeItem('sb-access-token');
    
    return await supabase.auth.signOut({
      scope: 'local' // Only sign out from this tab
    });
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: { message: 'Sign out failed' } };
  }
};

export const getSession = async () => {
  try {
    // First try to get session from Supabase client
    const { data, error } = await supabase.auth.getSession();
    
    // If no session, try to get it from localStorage as fallback
    if (!data.session && !error) {
      const storedSession = localStorage.getItem('supabase.auth.token');
      if (storedSession) {
        try {
          const parsedSession = JSON.parse(storedSession);
          // If stored session exists but has expired, clear it
          if (parsedSession.expires_at && new Date(parsedSession.expires_at * 1000) < new Date()) {
            localStorage.removeItem('supabase.auth.token');
            return { data: { session: null } };
          }
          return { data: { session: parsedSession } };
        } catch (e) {
          console.error('Error parsing stored session:', e);
          localStorage.removeItem('supabase.auth.token');
        }
      }
    }
    
    return { data, error };
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
    // Force save the refreshed session
    if (data.session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
    }
    return { data, error: null };
  } catch (error) {
    console.error('Refresh session error:', error);
    return { data: null, error };
  }
};
