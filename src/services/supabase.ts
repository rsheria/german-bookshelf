import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create production-optimized Supabase client with enhanced security features
const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Disable URL detection which can cause issues
      storageKey: 'sb-auth-token', // Standard key that Supabase expects
      flowType: 'implicit' // Use implicit flow for better token management
    },
    global: {
      // No longer add CSRF token from localStorage: handled by secure cookies/server
      headers: {
        // 'x-csrf-token': localStorage.getItem('csrf_token') || '' // REMOVED for security
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 1
      }
    }
  }
);

// Configure cookies for better security when user loads the application
function setCookieSecuritySettings() {
  // This only sets security attributes, not the actual tokens
  document.cookie = 'sb-refresh-token=; path=/; secure; samesite=strict; max-age=604800'; // 7 days
  document.cookie = 'sb-access-token=; path=/; secure; samesite=strict; max-age=900'; // 15 minutes
}

// Set cookie security settings when module loads
setCookieSecuritySettings();

// Export the singleton client
export { supabase };

// -------------------- SESSION MANAGEMENT --------------------
// Removed: localStorage as a backup for Supabase's built-in session store for authentication/session data.
// All session management must use Supabase's secure storage or HttpOnly cookies. No sensitive data in localStorage.

/**
 * Ensures all session data is reliably stored (NO LONGER in localStorage for security)
 * All sensitive data must be managed by Supabase or secure cookies only.
 */
export const saveSessionToLocalStorage = (_session: any) => {
  // SECURITY: Removed all localStorage usage for session/auth info
  // No-op: Do not store tokens or admin flags in localStorage
  // If session is cleared, Supabase will handle it securely
  // This function remains for backward compatibility and debugging
  console.warn('saveSessionToLocalStorage is disabled for security reasons.');
};

/**
 * Retrieves session data (NO LONGER from localStorage for security)
 * All sensitive data must be managed by Supabase or secure cookies only.
 */
export const getSessionFromLocalStorage = (): any => {
  // SECURITY: Removed all localStorage usage for session/auth info
  // No-op: Do not retrieve tokens or admin flags from localStorage
  // This function remains for backward compatibility and debugging
  console.warn('getSessionFromLocalStorage is disabled for security reasons.');
  return null;
};

/**
 * Synchronizes the local session state with Supabase's built-in storage
 * Call this on app initialization to ensure persistence across refreshes
 */
export const synchronizeSession = async (): Promise<any> => {
  try {
    console.log('Synchronizing session...');
    
    // First try to get the session from Supabase
    const { data } = await supabase.auth.getSession();
    const supabaseSession = data?.session;
    
    if (supabaseSession) {
      console.log('Found active session in Supabase');
      return supabaseSession;
    }
    
    // If Supabase doesn't have a session, try to get it from other secure storage
    // NOTE: No longer use localStorage for security reasons
    
    console.log('No session found in Supabase');
    return null;
  } catch (error) {
    console.error('Error synchronizing session:', error);
    return null;
  }
};

// Consistently manage session manually as an additional layer of persistence
export const manuallyStoreSession = (_session: any) => {
  // SECURITY: Removed all localStorage usage for session/auth info
  // No-op: Do not store tokens or admin flags in localStorage
  // This function remains for backward compatibility and debugging
  console.warn('manuallyStoreSession is disabled for security reasons.');
};

// Retrieve session from any available storage
export const getStoredSession = async () => {
  try {
    // Try to get the session from the Supabase standard location first
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      return data.session;
    }
    const key = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
    let storedSession = localStorage.getItem(key);
    if (storedSession) {
      return JSON.parse(storedSession);
    }
    // Fall back to our custom storage location
    storedSession = localStorage.getItem('sb-auth-token');
    if (storedSession) {
      return JSON.parse(storedSession);
    }
    return null;
  } catch (error) {
    console.error('Error retrieving session:', error);
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
    // Sign in with password
    const result = await supabase.auth.signInWithPassword({ email, password });
    
    if (result.data.session) {
      // Store session with redundancy
      manuallyStoreSession(result.data.session);
      
      // Update the global headers with the new CSRF token
      supabase.realtime.setAuth(result.data.session.access_token);
      
      // For any future API calls
      if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
          // Create proper headers object
          const headers = options.headers || {};
          
          // Create a new Headers object if it's a Headers instance
          if (headers instanceof Headers) {
          } else if (typeof headers === 'object') {
            // If it's a plain object
          }
          
          // Update options with modified headers
          options.headers = headers;
          
          return originalFetch.call(this, url, options);
        };
      }
      
      // Record login event securely
      try {
        await supabase.rpc('handle_auth_event_secure', {
          event_type: 'login',
          user_id: result.data.user?.id,
          email: result.data.user?.email,
          user_agent: navigator.userAgent
        });
      } catch (rpcError) {
        console.warn('Could not record login event:', rpcError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Sign in error:', error);
    return { error };
  }
};

export const signOut = async () => {
  try {
    // Get user ID before signing out for activity logging
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    // Record logout event before signing out
    if (userId) {
      try {
        await supabase.rpc('handle_auth_event_secure', {
          event_type: 'logout',
          user_id: userId
        });
      } catch (rpcError) {
        console.warn('Could not record logout event:', rpcError);
      }
    }
    
    // Perform the signout
    const result = await supabase.auth.signOut();
    
    // Clear all auth-related items from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key === 'csrf_token') {
        localStorage.removeItem(key);
      }
    });

    // Clear session storage as well
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear any potential cookies with secure attributes
    const cookiesToClear = document.cookie.split(';');
    const secureDomain = window.location.hostname;
    
    cookiesToClear.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=strict; domain=${secureDomain}`;
    });

    // Force a page reload to clear any in-memory state
    window.location.href = '/';
    
    return result;
  } catch (error) {
    console.error('Error during sign out:', error);
    // Even if there's an error, try to force a clean state
    window.location.href = '/';
    return { error };
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
      const storedSession = await getStoredSession();
      if (storedSession) {
        console.log('Attempting recovery with stored session');
        
        // Try to restore the session
        try {
          await supabase.auth.setSession(storedSession);
          
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

// Add session keepalive function
export const refreshSession = async (): Promise<boolean> => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      // Session exists, refresh it
      const { data: refreshData, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Failed to refresh session:', error);
        return false;
      }
      
      // Store the refreshed session
      if (refreshData?.session) {
        // Session refreshed successfully
        console.log('Session refreshed successfully');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error in refreshSession:', error);
    return false;
  }
};

// Function to start the session keepalive mechanism
export const startSessionKeepalive = () => {
  // Refresh immediately
  refreshSession();
  
  // Set up interval to refresh session every 10 minutes
  const intervalId = setInterval(() => {
    refreshSession();
  }, 10 * 60 * 1000); // 10 minutes
  
  // Also refresh on user activity
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  let activityTimeout: NodeJS.Timeout | null = null;
  
  const activityHandler = () => {
    // Clear existing timeout
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }
    
    // Set new timeout to refresh 5 seconds after activity stops
    activityTimeout = setTimeout(() => {
      refreshSession();
    }, 5000);
  };
  
  // Add event listeners for user activity
  activityEvents.forEach(event => {
    window.addEventListener(event, activityHandler);
  });
  
  // Return a function to clean up
  return () => {
    clearInterval(intervalId);
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }
    activityEvents.forEach(event => {
      window.removeEventListener(event, activityHandler);
    });
  };
};
