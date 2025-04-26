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
      // Add CSRF token to all requests if available
      headers: {
        'x-csrf-token': localStorage.getItem('csrf_token') || ''
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
// We use localStorage as a reliable backup for Supabase's built-in session store

/**
 * Ensures all session data is reliably stored in localStorage to prevent login loss on refresh
 */
export const saveSessionToLocalStorage = (session: any) => {
  if (!session) {
    console.log('Removing session from localStorage');
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('sb-session');
    localStorage.removeItem('supabase-auth-token');
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    localStorage.removeItem('user_is_admin');
    localStorage.removeItem('csrf_token'); // Remove CSRF token on session clear
    return;
  }

  try {
    // First, standard Supabase key
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      currentSession: session,
      expiresAt: Math.floor(new Date(session.expires_at || new Date().toISOString()).getTime() / 1000),
    }));

    // Second, backup in our own format for redundancy
    localStorage.setItem('sb-session', JSON.stringify(session));
    
    // Save individual components for triple redundancy
    if (session.access_token) {
      localStorage.setItem('sb-access-token', session.access_token);
    }
    if (session.refresh_token) {
      localStorage.setItem('sb-refresh-token', session.refresh_token);
    }
    
    // Handle admin status
    if (session.user?.app_metadata?.is_admin) {
      localStorage.setItem('user_is_admin', 'true');
    }
    
    console.log('Session saved to localStorage with triple redundancy');
  } catch (error) {
    console.error('Error saving session to localStorage:', error);
  }
};

/**
 * Retrieves session data from localStorage (used as fallback if Supabase fails)
 */
export const getSessionFromLocalStorage = (): any => {
  try {
    // Try the standard Supabase key first
    const supabaseToken = localStorage.getItem('supabase.auth.token');
    if (supabaseToken) {
      const parsed = JSON.parse(supabaseToken);
      if (parsed?.currentSession) {
        console.log('Retrieved session from supabase.auth.token');
        return parsed.currentSession;
      }
    }
    
    // Try our backup format
    const sbSession = localStorage.getItem('sb-session');
    if (sbSession) {
      console.log('Retrieved session from sb-session backup');
      return JSON.parse(sbSession);
    }
    
    // Try to manually reconstruct from components
    const accessToken = localStorage.getItem('sb-access-token');
    const refreshToken = localStorage.getItem('sb-refresh-token');
    
    if (accessToken && refreshToken) {
      console.log('Reconstructing session from individual tokens');
      
      // Create a basic session object with the tokens
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        token_type: 'bearer',
        user: {
          id: '', // Will be populated by Supabase on first API call
          app_metadata: {
            provider: 'email',
            is_admin: localStorage.getItem('user_is_admin') === 'true',
          },
          user_metadata: {},
          aud: 'authenticated',
          confirmed_at: '',
          created_at: '',
          updated_at: '',
          email: '',
          phone: '',
          role: 'authenticated',
        },
      };
      
      return session;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving session from localStorage:', error);
    return null;
  }
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
      console.log('Found active session in Supabase, saving to localStorage');
      saveSessionToLocalStorage(supabaseSession);
      return supabaseSession;
    }
    
    // If Supabase doesn't have a session, try to get it from localStorage
    const localSession = getSessionFromLocalStorage();
    
    if (localSession && localSession.access_token && localSession.refresh_token) {
      console.log('Found session in localStorage, restoring to Supabase');
      
      // Set the session in Supabase manually
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: localSession.access_token,
          refresh_token: localSession.refresh_token,
        });
        
        if (error) {
          console.error('Error setting session in Supabase:', error);
          // Even if setSession fails, we still have the session data
          return localSession;
        }
        
        if (data?.session) {
          console.log('Successfully restored session to Supabase');
          saveSessionToLocalStorage(data.session);
          return data.session;
        }
      } catch (setSessionError) {
        console.error('Error in setSession:', setSessionError);
        // Return the local session even if there was an error
        return localSession;
      }
    }
    
    console.log('No session found in Supabase or localStorage');
    return null;
  } catch (error) {
    console.error('Error synchronizing session:', error);
    
    // Fallback to localStorage if everything else fails
    return getSessionFromLocalStorage();
  }
};

// Consistently manage session manually as an additional layer of persistence
export const manuallyStoreSession = (session: any) => {
  if (!session) return;
  
  try {
    // Store session using the correct key format for Supabase
    const key = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
    localStorage.setItem(key, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: 'bearer',
      user: session.user
    }));
    
    // Also store in our own consistent location
    localStorage.setItem('sb-auth-token', JSON.stringify(session));
    console.log('Session manually stored in multiple locations for redundancy');
  } catch (error) {
    console.error('Error saving session redundantly:', error);
  }
};

// Retrieve session from any available storage
export const getStoredSession = () => {
  try {
    // Try to get the session from the Supabase standard location first
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

// Generate a cryptographically secure CSRF token
function generateCsrfToken() {
  const array = new Uint8Array(32); // 256 bits of entropy
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export const signIn = async (email: string, password: string) => {
  try {
    // Generate a new CSRF token for this session
    const csrfToken = generateCsrfToken();
    localStorage.setItem('csrf_token', csrfToken);
    
    // Sign in with password
    const result = await supabase.auth.signInWithPassword({ email, password });
    
    if (result.data.session) {
      // Store session with redundancy
      manuallyStoreSession(result.data.session);
      
      // Update the global headers with the new CSRF token
      supabase.realtime.setAuth(result.data.session.access_token);
      
      // Set CSRF token in localStorage for future requests
      localStorage.setItem('x-csrf-token', csrfToken);
      
      // Store CSRF token for future fetch requests
      // We'll use this in our fetch interceptor
      localStorage.setItem('csrf_token', csrfToken);
      
      // For any future API calls
      if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
          // Create proper headers object
          const headers = options.headers || {};
          
          // Add CSRF token to headers
          const csrfToken = localStorage.getItem('csrf_token') || '';
          
          // Create a new Headers object if it's a Headers instance
          if (headers instanceof Headers) {
            headers.append('x-csrf-token', csrfToken);
          } else if (typeof headers === 'object') {
            // If it's a plain object
            (headers as Record<string, string>)['x-csrf-token'] = csrfToken;
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
    
    // Get CSRF token for secure logout request
    const csrfToken = localStorage.getItem('csrf_token');
    
    // Add CSRF token to headers for this request
    if (csrfToken) {
      // We're using the fetch interceptor to add the CSRF token header
      // No additional action needed here as headers will be added by our fetch interceptor
    }
    
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

// Add session keepalive function
export const refreshSession = async (): Promise<boolean> => {
  try {
    // Get current CSRF token
    const csrfToken = localStorage.getItem('csrf_token');
    
    // Set CSRF token in request headers
    if (csrfToken) {
      // We're using the fetch interceptor to add the CSRF token header
      // No additional action needed here as headers will be added by our fetch interceptor
    }
    
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
        // Generate a new CSRF token for the refreshed session (token rotation)
        const newCsrfToken = generateCsrfToken();
        localStorage.setItem('csrf_token', newCsrfToken);
        
        // Update CSRF token for future requests
        localStorage.setItem('csrf_token', newCsrfToken);
        // The fetch interceptor will use this updated token automatically
        
        // Session refreshed successfully
        console.log('Session refreshed successfully with new CSRF token');
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
