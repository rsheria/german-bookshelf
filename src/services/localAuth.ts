// localAuth.ts - A completely local authentication implementation that doesn't rely on Supabase
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

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Local store key
const LOCAL_STORE_KEY = 'german_bookshelf_local_auth';

// Initialize local storage with default values
const initializeLocalStore = (): LocalStore => {
  return {
    user: null,
    loggedIn: false,
    lastActive: Date.now(),
    adminMode: false
  };
};

// Get the current local store
export const getLocalStore = (): LocalStore => {
  if (!isBrowser) return initializeLocalStore();
  
  try {
    const storedData = localStorage.getItem(LOCAL_STORE_KEY);
    if (!storedData) return initializeLocalStore();
    
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error parsing local auth store:', error);
    return initializeLocalStore();
  }
};

// Save the local store
const saveLocalStore = (store: LocalStore) => {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Error saving local auth store:', error);
  }
};

// Update last active timestamp
export const updateLastActive = () => {
  const store = getLocalStore();
  store.lastActive = Date.now();
  saveLocalStore(store);
};

// Set user from Supabase user
export const setUserFromSupabase = (supabaseUser: User | null, isAdmin: boolean = false) => {
  if (!isBrowser) return;
  
  const store = getLocalStore();
  
  if (supabaseUser) {
    store.user = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user',
      isAdmin: isAdmin || !!supabaseUser.app_metadata?.is_admin
    };
    store.loggedIn = true;
    store.adminMode = store.user.isAdmin;
  } else {
    store.user = null;
    store.loggedIn = false;
    store.adminMode = false;
  }
  
  store.lastActive = Date.now();
  saveLocalStore(store);
};

// Check if user is logged in
export const isLoggedIn = (): boolean => {
  const store = getLocalStore();
  return !!store.loggedIn && !!store.user;
};

// Get current user
export const getCurrentUser = (): LocalUser | null => {
  const store = getLocalStore();
  return store.user;
};

// Check if user is admin
export const isAdmin = (): boolean => {
  const store = getLocalStore();
  return !!store.adminMode && !!store.user?.isAdmin;
};

// Clear all auth data
export const clearAuthData = () => {
  if (!isBrowser) return;
  
  const emptyStore = initializeLocalStore();
  saveLocalStore(emptyStore);
};

// Set up event listeners to keep auth fresh
export const initializeLocalAuth = () => {
  if (!isBrowser) return;
  
  // Update last active timestamp on user interaction
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
  
  console.log('Local auth system initialized');
};

// Force enable admin mode for testing
export const enableAdminMode = () => {
  const store = getLocalStore();
  if (store.user) {
    store.user.isAdmin = true;
    store.adminMode = true;
    saveLocalStore(store);
    return true;
  }
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
