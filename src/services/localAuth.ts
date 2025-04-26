// localAuth.ts - DISABLED: Client-side authentication has been replaced with secure server validation
// SECURITY NOTICE: This module has been completely disabled for security reasons.
// All authentication and admin privilege checks should now use Supabase's secure session management.
import { User } from '@supabase/supabase-js';

// Store types
interface LocalUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

interface LocalStore {
  user: LocalUser | null;
  loggedIn: boolean;
  lastActive: number;
  adminMode: boolean;
}

// Local store key (no longer used for auth, but kept for reference)
const LOCAL_STORE_KEY = 'german_bookshelf_local_auth';

// Initialize local storage with default values
const initializeLocalStore = (): LocalStore => {
  // SECURITY: Removed client-side security control storage
  return {
    user: null,
    loggedIn: false,
    lastActive: Date.now(),
    adminMode: false
  };
};

// Get the current local store
export const getLocalStore = (): LocalStore => {
  // SECURITY: No longer use localStorage for authentication data
  return initializeLocalStore();
};

// Save the local store - exported for backward compatibility
export const saveLocalStore = (_store: LocalStore) => {
  // SECURITY: No longer store authentication data in localStorage
  console.warn("Authentication data no longer stored in localStorage for security reasons");
};

// Update last active timestamp
export const updateLastActive = () => {
  // Non-sensitive tracking functionality can remain
  const timestamp = Date.now();
  // We only set the timestamp, not any auth data
  try {
    localStorage.setItem('app_last_active', timestamp.toString());
  } catch (error) {
    console.error('Error updating last active timestamp:', error);
  }
};

// Set user from Supabase user
export const setUserFromSupabase = (_supabaseUser: User | null, _isAdmin: boolean = false) => {
  // SECURITY: No longer store authentication data in localStorage
  // This function is kept for backward compatibility but no longer actually stores any data
  console.warn("Authentication data no longer stored in localStorage for security reasons");
};

// Check if user is logged in
export const isLoggedIn = (): boolean => {
  // SECURITY: Rely on Supabase session instead of localStorage
  // This is just a placeholder - the real check should be done using AuthContext
  return false;
};

// Get current user
export const getCurrentUser = (): LocalUser | null => {
  // SECURITY: No longer use localStorage for authentication data
  // This is just a placeholder - the real check should be done using AuthContext
  return null;
};

// Check if user is admin
export const isAdmin = (): boolean => {
  // SECURITY: No longer use localStorage for admin status
  // This is just a placeholder - the real check should be done using AuthContext and server validation
  return false;
};

// Clear all auth data
export const clearAuthData = () => {
  // We can keep this function to clear any lingering data
  try {
    localStorage.removeItem(LOCAL_STORE_KEY);
    localStorage.removeItem('sb-auth-token');
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('user_is_admin');
    sessionStorage.removeItem('supabase.auth.token');
    
    // Also remove any other auth-related items
    localStorage.removeItem('adminMode');
    localStorage.removeItem('isAdmin');
  } catch (e) {
    console.error('Error clearing tokens:', e);
  }
};

// Set up event listeners to keep auth fresh
export const initializeLocalAuth = () => {
  // Keep the activity tracking part which is not a security issue
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  activityEvents.forEach(eventType => {
    window.addEventListener(eventType, () => {
      updateLastActive();
    });
  });
  
  // Update every 30 seconds regardless
  setInterval(() => {
    updateLastActive();
  }, 30000);
  
  console.log('Activity tracking initialized');
};

// Force enable admin mode for testing - DISABLED FOR SECURITY
export const enableAdminMode = () => {
  // SECURITY: Disabled client-side admin mode override
  console.error("SECURITY: Client-side admin mode override has been disabled");
  return false;
};

export default {
  setUserFromSupabase,
  isLoggedIn,
  getCurrentUser,
  isAdmin,
  clearAuthData,
  initializeLocalAuth,
  enableAdminMode
};
