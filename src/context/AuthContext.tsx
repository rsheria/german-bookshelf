import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, saveSessionToLocalStorage, getSessionFromLocalStorage, synchronizeSession } from '../services/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
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

  // Initialize auth state with extra reliability to handle refreshes
  useEffect(() => {
    // This function uses our triple-redundancy session management
    const initializeAuth = async () => {
      console.log('Initializing auth state with enhanced reliability...');
      setIsLoading(true);
      
      try {
        // Attempt to synchronize session between Supabase and localStorage
        const session = await synchronizeSession();
        
        if (session) {
          console.log('Session synchronized successfully');
          
          // Set user data
          setUser(session.user);
          
          // Check if the user is an admin
          const isUserAdmin = 
            session.user?.app_metadata?.is_admin === true || 
            localStorage.getItem('user_is_admin') === 'true';
            
          setIsAdmin(!!isUserAdmin);
          
          if (isUserAdmin) {
            console.log('User is an admin');
            localStorage.setItem('user_is_admin', 'true');
          }
        } else {
          console.log('No active session found');
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        
        // EMERGENCY FALLBACK: If everything else fails, try to restore from localStorage
        const localSession = getSessionFromLocalStorage();
        if (localSession) {
          console.log('EMERGENCY: Restoring session from localStorage');
          setUser(localSession.user);
          setIsAdmin(localStorage.getItem('user_is_admin') === 'true');
        } else {
          // Reset auth state if no session can be found
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Call the initialization function
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session) {
          console.log('New session established');
          setUser(session.user);
          
          // Save session data with triple redundancy
          saveSessionToLocalStorage(session);
          
          // Check if user is admin
          const isUserAdmin = session.user?.app_metadata?.is_admin === true;
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
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
      
      // Force clear localStorage even if Supabase fails
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-session');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('user_is_admin');
      
      // Force reset auth state
      setUser(null);
      setIsAdmin(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin, 
      isLoading, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
