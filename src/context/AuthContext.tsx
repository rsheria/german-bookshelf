import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, saveSessionToLocalStorage, getSessionFromLocalStorage, synchronizeSession } from '../services/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  session: any | null;
  profile: any | null;
  error: Error | null;
  refreshSession: () => Promise<{ data: { session: any | null }, error: Error | null }>;
  authStatusChecked: boolean;
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
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [authStatusChecked, setAuthStatusChecked] = useState<boolean>(false);

  // Initialize auth state with extra reliability to handle refreshes
  useEffect(() => {
    // This function uses our triple-redundancy session management
    const initializeAuth = async () => {
      console.log('Initializing auth state with enhanced reliability...');
      setIsLoading(true);
      setAuthStatusChecked(false);
      
      try {
        // Attempt to synchronize session between Supabase and localStorage
        const sessionData: any = await synchronizeSession();
        
        if (sessionData) {
          console.log('Session synchronized successfully');
          
          // Set session data
          setSession(sessionData);
          
          // Set user data - handle potential undefined values
          if (sessionData.user) {
            setUser(sessionData.user);
            
            // Try to fetch profile data if we have a user
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionData.user.id)
                .single();
                
              if (profileData) {
                setProfile(profileData);
              }
            } catch (profileError) {
              console.error('Error fetching profile:', profileError);
            }
          }
          
          // Check if the user is an admin
          const isUserAdmin = 
            sessionData.user?.app_metadata?.is_admin === true || 
            localStorage.getItem('user_is_admin') === 'true';
            
          setIsAdmin(!!isUserAdmin);
          
          if (isUserAdmin) {
            console.log('User is an admin');
            localStorage.setItem('user_is_admin', 'true');
          }
        } else {
          console.log('No active session found');
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } catch (authError) {
        console.error('Error initializing auth:', authError);
        setError(authError instanceof Error ? authError : new Error(String(authError)));
        
        // EMERGENCY FALLBACK: If everything else fails, try to restore from localStorage
        try {
          const localSession = getSessionFromLocalStorage();
          if (localSession && localSession.user) {
            console.log('EMERGENCY: Restoring session from localStorage');
            setSession(localSession);
            setUser(localSession.user);
            setIsAdmin(localStorage.getItem('user_is_admin') === 'true');
          } else {
            // Reset auth state if no session can be found
            setUser(null);
            setSession(null);
            setProfile(null);
            setIsAdmin(false);
          }
        } catch (fallbackError) {
          console.error('Error in fallback auth handling:', fallbackError);
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } finally {
        setIsLoading(false);
        setAuthStatusChecked(true);
        console.log('Auth initialization complete, status checked:', true);
      }
    };

    // Call the initialization function
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sessionData) => {
        console.log('Auth state changed:', event);
        
        if (sessionData) {
          console.log('New session established');
          setUser(sessionData.user);
          setSession(sessionData);
          
          // Try to fetch profile data if we have a user
          if (sessionData.user) {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionData.user.id)
                .single();
                
              if (profileData) {
                setProfile(profileData);
              }
            } catch (profileError) {
              console.error('Error fetching profile:', profileError);
            }
          }
          
          // Save session data with triple redundancy
          saveSessionToLocalStorage(sessionData);
          
          // Check if user is admin
          const isUserAdmin = sessionData.user?.app_metadata?.is_admin === true;
          setIsAdmin(isUserAdmin);
          
          if (isUserAdmin) {
            console.log('User is admin');
            localStorage.setItem('user_is_admin', 'true');
          } else {
            localStorage.removeItem('user_is_admin');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
          
          // Clear all session data
          saveSessionToLocalStorage(null);
        }
      }
    );

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function with enhanced reliability
  const signOut = async () => {
    try {
      // First remove from localStorage to ensure it's gone even if Supabase fails
      saveSessionToLocalStorage(null);
      
      // Then sign out from Supabase
      await supabase.auth.signOut();
      
      // Reset auth state
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setAuthStatusChecked(true);
    } catch (logoutError) {
      console.error('Error signing out:', logoutError);
      setError(logoutError instanceof Error ? logoutError : new Error(String(logoutError)));
      
      // Force clear localStorage even if Supabase fails
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-session');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('user_is_admin');
      
      // Force reset auth state
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
    }
  };

  // Implement the refreshSession function required by the interface
  const refreshSession = async () => {
    try {
      console.log('Manually refreshing session...');
      const refreshedSession = await synchronizeSession();
      
      if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        
        // Try to fetch updated profile
        if (refreshedSession.user) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', refreshedSession.user.id)
              .single();
              
            if (profileData) {
              setProfile(profileData);
            }
          } catch (profileError) {
            console.error('Error refreshing profile data:', profileError);
          }
        }
        
        return { data: { session: refreshedSession }, error: null };
      } else {
        console.log('No session found during refresh');
        return { data: { session: null }, error: null };
      }
    } catch (refreshError) {
      console.error('Error refreshing session:', refreshError);
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
      signOut, 
      session, 
      profile, 
      error, 
      refreshSession, 
      authStatusChecked 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
