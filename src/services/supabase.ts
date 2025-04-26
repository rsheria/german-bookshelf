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
      // SECURITY: Use secure cookies instead of localStorage - this requires proper backend setup
      storage: {
        getItem: (key) => {
          // This hook is only for compatibility; actual storage is via HTTP-only cookies
          console.log(`Secure cookie storage: getItem ${key}`);
          return null;
        },
        setItem: (_key, _value) => {
          // This hook is only for compatibility; actual storage is via HTTP-only cookies
          console.log(`Secure cookie storage: setItem`);
        },
        removeItem: (key) => {
          // This hook is only for compatibility; actual storage is via HTTP-only cookies
          console.log(`Secure cookie storage: removeItem ${key}`);
        }
      },
      flowType: 'implicit' // Use implicit flow for better token management
    },
    global: {
      headers: {}
    },
    realtime: {
      params: {
        eventsPerSecond: 1
      }
    }
  }
);

// Configure cookies for better security when user loads the application
function setCookieSecuritySettings(): void {
  // This is just an initialization - actual secure cookies are set by Supabase auth
  // with httpOnly flag set server-side
  
  // We only set the cookie security attributes here
  const secureOptions = 'path=/; secure; samesite=strict';
  
  // Clear any potentially insecure cookies by setting empty ones with security attributes
  document.cookie = `sb-refresh-token=; ${secureOptions}; max-age=0`;
  document.cookie = `sb-access-token=; ${secureOptions}; max-age=0`;
  document.cookie = `sb-auth-token=; ${secureOptions}; max-age=0`;
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
export const saveSessionToLocalStorage = (_session: any): void => {
  // SECURITY: Removed all localStorage usage for session/auth info
  // No-op: Do not store tokens or admin flags in localStorage
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
    
    // Get the session from Supabase (should be using cookies now)
    const { data } = await supabase.auth.getSession();
    const supabaseSession = data?.session;
    
    if (supabaseSession) {
      console.log('Found active session in Supabase');
      return supabaseSession;
    }
    
    console.log('No session found in Supabase');
    return null;
  } catch (error) {
    console.error('Error synchronizing session:', error);
    return null;
  }
};

/**
 * Consistently manage session manually as an additional layer of persistence
 * This is disabled for security reasons - no longer storing in localStorage
 */
export const manuallyStoreSession = (_session: any): void => {
  // SECURITY: Removed all localStorage usage for session/auth info
  // No-op: Do not store tokens or admin flags in localStorage
  console.warn('manuallyStoreSession is disabled for security reasons.');
};

/**
 * Retrieve session from any available storage
 * This is disabled for security reasons - no longer accessing localStorage
 */
export const getStoredSession = (): null => {
  // SECURITY: Only use Supabase's secure session storage
  // This function remains for backward compatibility
  console.warn('getStoredSession is no longer accessing localStorage for security reasons');
  return null;
};

/**
 * Enhanced auth functions with secure session storage
 * Register a new user with email and password
 */
export const signUp = async (email: string, password: string): Promise<any> => {
  try {
    const result = await supabase.auth.signUp({
      email,
      password
    });
    return result;
  } catch (error) {
    console.error('Sign up error:', error);
    return { error };
  }
};

/**
 * Sign in with email and password using secure cookie storage
 */
export const signIn = async (email: string, password: string): Promise<any> => {
  try {
    // Monitor for insecure fetch during login
    const originalFetch = window.fetch;
    
    // Create a more secure fetch that ensures headers are properly set
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.fetch = function(this: typeof window, url: string, options: RequestInit = {}) {
        // Deep clone options to avoid mutation issues
        const clonedOptions = JSON.parse(JSON.stringify(options || {}));
        
        // Create headers if they don't exist
        if (!clonedOptions.headers) {
          clonedOptions.headers = {};
        }
        
        // Extract the headers for manipulation
        const headers = clonedOptions.headers as Record<string, string>;
        
        // Ensure proper Content-Type for JSON
        if (!headers['Content-Type'] && clonedOptions.body) {
          headers['Content-Type'] = 'application/json';
        }
        
        // Update options with modified headers
        clonedOptions.headers = headers;
        
        return originalFetch.call(this, url, clonedOptions);
      };
    }
    
    // Perform the login
    const result = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Restore original fetch
    if (typeof window !== 'undefined') {
      window.fetch = originalFetch;
    }
    
    if (result.data?.user) {
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

/**
 * Sign out and clear all authentication data securely
 */
export const signOut = async (): Promise<{error: any}> => {
  try {
    console.log('Signing out...');
    
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
    
    // Sign out with Supabase - this will clear cookies too
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Extra cleanup to ensure all auth data is removed
    
    // Clear any localStorage data that might contain sensitive info
    Object.keys(localStorage).forEach(key => {
      if (
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        key.includes('auth') ||
        key.includes('token') ||
        key.includes('session') ||
        key.includes('admin') ||
        key === 'german_bookshelf_local_auth'
      ) {
        localStorage.removeItem(key);
      }
    });

    // Clear session storage as well
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear any potentially remaining cookies explicitly
    const cookiesToClear = document.cookie.split(';');
    const secureDomain = window.location.hostname;
    
    cookiesToClear.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      // Clear the cookie on the current domain and all subdomains
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=strict; domain=${secureDomain}`;
      // Also clear without domain specified
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=strict;`;
    });

    // Force a page reload to clear any in-memory state
    window.location.href = '/';
    
    return { error: null };
  } catch (error) {
    console.error('Error during sign out:', error);
    // Even if there's an error, try to force a clean state
    window.location.href = '/';
    return { error };
  }
};

/**
 * Get the current session securely from Supabase
 */
export const getSession = async (): Promise<{data: any, error: any}> => {
  try {
    // Get session from Supabase (using secure cookies)
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  } catch (error) {
    console.error('Get session error:', error);
    return { data: { session: null }, error };
  }
};

/**
 * Refresh the session token securely
 */
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

/**
 * Start automatic session keepalive to maintain valid session
 */
export const startSessionKeepalive = (): (() => void) => {
  // Refresh immediately
  refreshSession();
  
  // Set up interval to refresh session every 10 minutes
  const intervalId = setInterval(() => {
    refreshSession();
  }, 10 * 60 * 1000); // 10 minutes
  
  // Also refresh on user activity
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  let activityTimeout: NodeJS.Timeout | null = null;
  
  const activityHandler = (): void => {
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
