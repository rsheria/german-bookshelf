import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
// Import only the clearAuthData function from localAuth
import { clearAuthData } from '../services/localAuth';
import { logUserActivity, ActivityType } from '../services/activityService';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isAdmin: boolean;
  isLoading: boolean;
  authStatusChecked: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<{ 
    error: Error | null; 
    data: { user: User | null; session: Session | null } | null 
  }>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<{ 
    error: Error | null; 
    data: { user: User | null; session: Session | null } | null 
  }>;
  refreshSession: () => Promise<{ data: { session: Session | null }, error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [authStatusChecked, setAuthStatusChecked] = useState<boolean>(false);

  // Initialize auth state with extra reliability to handle refreshes
  // Helper: verify user exists
  const verifyUserExists = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      if (error || !data) {
        console.log('User no longer exists in Supabase:', userId);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error verifying user existence:', e);
      return false;
    }
  }, []);

  // Initialize auth state with extra reliability to handle refreshes
  const initializeAuth = useCallback(async () => {
    console.log('Initializing auth state with fail-proof backup system...');
    setIsLoading(true);
    setAuthStatusChecked(false);
    try {
      // SECURITY: No longer using client-side localStorage auth checks
      // Only using Supabase's secure server-verified session
      
      // Regular path - attempt to get session from Supabase
      const { data } = await supabase.auth.getSession();
      const sessionData = data?.session;
      
      if (sessionData) {
        console.log('Session synchronized successfully');
        
        // Set session data
        setSession(sessionData);
        setUser(sessionData.user);
        
        // SECURITY: Only trust server-verified admin status from JWT token
        const isUserAdmin = sessionData.user?.app_metadata?.is_admin === true;
        setIsAdmin(isUserAdmin);
        
        if (isUserAdmin) {
          console.log('User is an admin');
        }
      } else {
        console.log('No active session found');
        // Clear all auth data
        setUser(null);
        setSession(null);
        clearAuthData(); // Just used to remove any lingering data
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
      setAuthStatusChecked(true);
      console.log('Auth initialization complete');
    }
  }, [verifyUserExists]);

  useEffect(() => {
    // Check if user session exists
    initializeAuth();
    
    // Set up listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      setUser(session?.user || null);
      
      // SECURITY: Only use server-verified admin status
      if (session?.user) {
        const isUserAdmin = session.user.app_metadata?.is_admin === true;
        setIsAdmin(isUserAdmin);
      } else {
        setIsAdmin(false);
      }
    });
    
    // Set up listener for manual session storage sync
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'supabase.auth.token' || event.key === 'sb-access-token') {
        // Session may have changed in another tab
        initializeAuth();
      }
    };
    
    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [initializeAuth]);

  // Sign out function with enhanced reliability
  const signOut = async () => {
    try {
      // First set state to null to immediately remove UI access
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setAuthStatusChecked(true);
      
      // Remove all admin and auth data from localStorage 
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-session');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('user_is_admin');
      
      // Remove any other Supabase-related keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear session storage too
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Then sign out from Supabase
      await supabase.auth.signOut();
      // Clear localAuth data
      clearAuthData();

      // Force reload the page to clear any in-memory state
      window.location.href = '/';
    } catch (logoutError) {
      console.error('Error signing out:', logoutError);
      setError(logoutError instanceof Error ? logoutError : new Error(String(logoutError)));
      
      // Force clear localStorage even if Supabase fails
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-session');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('user_is_admin');
      // Clear localAuth data in fallback
      clearAuthData();
      
      // Force reset auth state
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };


  // Login function
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      if (data.session) {
        setUser(data.user);
        setSession(data.session);
        const isUserAdmin = data.user?.app_metadata?.is_admin === true;
        setIsAdmin(isUserAdmin);
        // No longer storing in localStorage for security reasons

        try {
          await logUserActivity(data.user.id, ActivityType.LOGIN);
        } catch (trackError) {
          console.error('Error tracking login:', trackError);
        }
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (profileData) {
            setProfile(profileData);
          }
        } catch (profileError) {
          console.error('Error fetching profile after login:', profileError);
        }
      }
      return { data: { user: data.user, session: data.session }, error: null };
    } catch (loginError) {
      console.error('Error logging in:', loginError);
      const typedError = loginError instanceof Error ? loginError : new Error(String(loginError));
      setError(typedError);
      return { data: { user: null, session: null }, error: typedError };
    }
  };

  // Signup function
  const signup = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      if (data.session) {
        setUser(data.user);
        setSession(data.session);
        setIsAdmin(data.user?.app_metadata?.is_admin === true);
        // No longer storing in localStorage for security reasons
      }
      return { data: { user: data.user, session: data.session }, error: null };
    } catch (signupError) {
      console.error('Error signing up:', signupError);
      const typedError = signupError instanceof Error ? signupError : new Error(String(signupError));
      setError(typedError);
      return { data: { user: null, session: null }, error: typedError };
    }
  };

  // Logout function
  const logout = async () => {
    await signOut();
  };

  // Refresh session function
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setSession(data.session || null);
      setUser(data.session?.user || null);
      return { data: { session: data.session || null }, error: null };
    } catch (refreshError) {
      const typedError = refreshError instanceof Error ? refreshError : new Error(String(refreshError));
      setError(typedError);
      return { data: { session: null }, error: typedError };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      isLoading,
      login,
      logout,
      signup,
      session,
      profile,
      error,
      refreshSession,
      signOut,
      authStatusChecked
    }}>
      {children}
    </AuthContext.Provider>
  );
};
