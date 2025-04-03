import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create production-optimized Supabase client with max reliability settings
const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // Enable redirect detection for auth flows
      storage: localStorage,    // Explicitly use localStorage for best compatibility
      storageKey: 'supabase.auth.token', // Use consistent storage key
      flowType: 'implicit' // Use implicit flow for better token management
    },
    global: {
      // Global error handler to make fetch operations more resilient
      fetch: (...args) => {
        return fetch(...args).catch(err => {
          console.error('Network error in Supabase client:', err);
          // Return empty OK response instead of crashing
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 1
      }
    }
  }
);

// Export the singleton client
export { supabase };

// Consistently manage session manually as an additional layer of persistence
export const manuallyStoreSession = (session: any) => {
  if (!session) return;
  
  try {
    // Store across multiple keys for redundancy
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    localStorage.setItem('sb-refresh-token', session.refresh_token || '');
    localStorage.setItem('sb-access-token', session.access_token || '');
    console.log('Session manually stored for redundancy');
  } catch (error) {
    console.error('Error saving session redundantly:', error);
  }
};

// Retrieve session from any available storage
export const getStoredSession = () => {
  try {
    const storedSession = localStorage.getItem('supabase.auth.token');
    if (storedSession) {
      return JSON.parse(storedSession);
    }
    return null;
  } catch (error) {
    console.error('Error retrieving redundant session:', error);
    return null;
  }
};

// Enhanced auth functions with redundant session storage
export const signUp = async (email: string, password: string) => {
  try {
    const result = await supabase.auth.signUp({ email, password });
    if (result.data.session) {
      manuallyStoreSession(result.data.session);
    }
    return result;
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: { user: null }, error: { message: 'Sign up failed' } };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.data.session) {
      manuallyStoreSession(result.data.session);
    }
    return result;
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: { user: null, session: null }, error: { message: 'Sign in failed' } };
  }
};

export const signOut = async () => {
  try {
    // Clear all stored sessions
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('sb-refresh-token');
    localStorage.removeItem('sb-access-token');
    
    return await supabase.auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: { message: 'Sign out failed' } };
  }
};

export const getSession = async () => {
  try {
    // First check for Supabase session
    const { data, error } = await supabase.auth.getSession();
    
    // If session exists, refresh our redundant copy
    if (data.session) {
      manuallyStoreSession(data.session);
      return { data, error };
    }
    
    // Try manual fallback if no Supabase session found
    if (!data.session && !error) {
      const storedSession = getStoredSession();
      if (storedSession) {
        console.log('Attempting recovery with stored session');
        
        // Try to restore the session
        try {
          await supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token || '',
          });
          
          // Check if session was restored
          const refreshedSession = await supabase.auth.getSession();
          if (refreshedSession.data.session) {
            return refreshedSession;
          }
        } catch (sessionError) {
          console.error('Session recovery attempt failed:', sessionError);
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
      console.error('Session refresh failed, attempting recovery');
      
      // Try to recover with stored tokens
      const storedSession = getStoredSession();
      if (storedSession) {
        try {
          // Try to set the session directly
          await supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token || '',
          });
          
          // Check if set session worked
          const recoveredSession = await supabase.auth.getSession();
          if (recoveredSession.data.session) {
            return { data: recoveredSession.data, error: null };
          }
        } catch (sessionError) {
          console.error('Session recovery failed:', sessionError);
        }
      }
      
      throw error;
    }
    
    if (data.session) {
      manuallyStoreSession(data.session);
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Refresh session error:', error);
    return { data: null, error };
  }
};
