import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// CUSTOM SESSION PERSISTENCE
// These keys are used for our manual session persistence system
const AUTH_STORAGE_KEY = 'sb-auth-token';
const LOCAL_STORAGE_KEY = 'supabase.auth.token';

// Create a truly persistent Supabase client with MAXIMUM storage options
const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Force storage to be localStorage
      storage: localStorage,
      storageKey: LOCAL_STORAGE_KEY,
      // Increase timeouts for better reliability
      flowType: 'implicit',
      debug: true
    },
    // Add global error handling
    global: {
      fetch: (...args) => {
        return fetch(...args).catch(err => {
          console.error('Network error in Supabase client:', err);
          // Return empty response to prevent crashes
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

// MANUAL SESSION PERSISTENCE SYSTEM
// Save current session to localStorage
const saveSessionToStorage = (session: any) => {
  if (!session) return;
  
  try {
    // Store in both formats for maximum compatibility
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem('sb-refresh-token', session.refresh_token || '');
    localStorage.setItem('sb-access-token', session.access_token || '');
    
    // Also store in cookies as a fallback (accessible via document.cookie)
    document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=86400; SameSite=Lax`;
    
    console.log('Session manually saved to storage');
  } catch (error) {
    console.error('Error saving session to storage:', error);
  }
};

// Retrieve session from storage
const getSessionFromStorage = () => {
  try {
    // Try multiple storage locations
    const storedSession = 
      localStorage.getItem(LOCAL_STORAGE_KEY) || 
      localStorage.getItem(AUTH_STORAGE_KEY);
    
    if (storedSession) {
      return JSON.parse(storedSession);
    }
    
    // Try to reconstruct from tokens
    const refreshToken = 
      localStorage.getItem('sb-refresh-token') || 
      getCookie('sb-refresh-token');
    const accessToken = 
      localStorage.getItem('sb-access-token') || 
      getCookie('sb-access-token');
    
    if (refreshToken && accessToken) {
      return {
        refresh_token: refreshToken,
        access_token: accessToken,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving session from storage:', error);
    return null;
  }
};

// Helper to get cookie value
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return '';
};

// Clear all session data
const clearSessionStorage = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('sb-refresh-token');
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('supabase.auth.token.v2');
    localStorage.removeItem('supabase.auth.token');
    document.cookie = 'sb-refresh-token=; path=/; max-age=0;';
    document.cookie = 'sb-access-token=; path=/; max-age=0;';
    console.log('Session storage cleared');
  } catch (error) {
    console.error('Error clearing session storage:', error);
  }
};

// Export the singleton client
export { supabase };

// Enhanced auth functions
export const signUp = async (email: string, password: string) => {
  try {
    const result = await supabase.auth.signUp({ email, password });
    if (result.data.session) {
      saveSessionToStorage(result.data.session);
    }
    return result;
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: { user: null }, error: { message: 'Sign up failed' } };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    // First clear any stale sessions
    clearSessionStorage();
    
    // Attempt sign in
    const result = await supabase.auth.signInWithPassword({ email, password });
    
    // Save session in multiple locations
    if (result.data.session) {
      saveSessionToStorage(result.data.session);
    }
    
    return result;
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: { user: null, session: null }, error: { message: 'Sign in failed' } };
  }
};

export const signOut = async () => {
  try {
    // Clear all storage first
    clearSessionStorage();
    
    // Then sign out from Supabase
    return await supabase.auth.signOut({
      scope: 'local'
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
    
    // If session exists, save it for redundancy
    if (data.session) {
      saveSessionToStorage(data.session);
      return { data, error };
    }
    
    // If no session, try our backup storage
    if (!data.session && !error) {
      const storedSession = getSessionFromStorage();
      
      if (storedSession) {
        console.log('Using manually stored session');
        
        // Try to recover the session in Supabase
        try {
          // Only attempt recovery if we have a refresh token
          if (storedSession.refresh_token) {
            const { data: refreshData } = await supabase.auth.refreshSession({
              refresh_token: storedSession.refresh_token,
            });
            
            if (refreshData.session) {
              saveSessionToStorage(refreshData.session);
              return { data: { session: refreshData.session }, error: null };
            }
          }
          
          // If we have an access token but can't refresh, just use the token directly
          if (storedSession.access_token) {
            await supabase.auth.setSession({
              access_token: storedSession.access_token,
              refresh_token: storedSession.refresh_token || '',
            });
            
            // Verify the session was set
            const newSession = await supabase.auth.getSession();
            if (newSession.data.session) {
              saveSessionToStorage(newSession.data.session);
              return newSession;
            }
          }
        } catch (refreshError) {
          console.error('Session recovery failed:', refreshError);
        }
        
        // Last resort: return the stored session directly
        return { data: { session: storedSession }, error: null };
      }
    }
    
    // No session found anywhere
    return { data, error };
  } catch (error) {
    console.error('Get session error:', error);
    
    // Final fallback - try to load from storage directly
    const storedSession = getSessionFromStorage();
    if (storedSession) {
      return { data: { session: storedSession }, error: null };
    }
    
    return { data: { session: null }, error };
  }
};

// Enhanced refresh with multiple fallbacks
export const refreshSession = async () => {
  try {
    // Try to refresh using Supabase's method first
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Refresh failed, trying manual recovery', error);
      
      // Fallback: Try to recover from storage
      const storedSession = getSessionFromStorage();
      
      if (storedSession?.refresh_token) {
        // Try explicit refresh with the stored token
        try {
          const manualRefresh = await supabase.auth.refreshSession({
            refresh_token: storedSession.refresh_token
          });
          
          if (manualRefresh.data.session) {
            saveSessionToStorage(manualRefresh.data.session);
            return { data: manualRefresh.data, error: null };
          }
        } catch (manualError) {
          console.error('Manual refresh failed:', manualError);
        }
      }
      
      // Last resort: attempt to set the session directly
      if (storedSession?.access_token) {
        try {
          await supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token || '',
          });
          
          // Check if session was restored
          const checkSession = await supabase.auth.getSession();
          if (checkSession.data.session) {
            saveSessionToStorage(checkSession.data.session);
            return { data: checkSession.data, error: null };
          }
        } catch (setError) {
          console.error('Set session failed:', setError);
        }
      }
      
      // If we have a stored session but couldn't refresh it,
      // return it anyway as a last resort
      if (storedSession) {
        return { data: { session: storedSession, user: storedSession.user }, error: null };
      }
      
      return { data: null, error };
    }
    
    // Success path - we got a refreshed session
    if (data.session) {
      saveSessionToStorage(data.session);
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Refresh session error:', error);
    
    // Final fallback
    const storedSession = getSessionFromStorage();
    if (storedSession) {
      return { data: { session: storedSession, user: storedSession.user }, error: null };
    }
    
    return { data: null, error };
  }
};
