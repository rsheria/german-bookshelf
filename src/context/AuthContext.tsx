import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, refreshSession } from '../services/supabase';
import { Profile } from '../types/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  isAdmin: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<boolean>;
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
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authStatusChecked, setAuthStatusChecked] = useState(false);
  
  // Enhanced fetchProfile with admin status persistence
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
      
      // Set admin status based on profile
      if (data && data.is_admin) {
        setIsAdmin(true);
        console.log("ADMIN STATUS SET TO TRUE!");
        // Store admin status in localStorage for persistence
        localStorage.setItem('user_is_admin', 'true');
      } else {
        setIsAdmin(false);
        console.log("ADMIN STATUS SET TO FALSE");
        localStorage.removeItem('user_is_admin');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Function to refresh session and fetch profile
  const handleRefreshSession = async () => {
    try {
      console.log("Refreshing session...");
      
      // Try to use our enhanced refreshSession function
      const { data } = await refreshSession();
      
      if (data?.session) {
        console.log("Session data: Found", data.session ? true : false);
        setSession(data.session);
        setUser(data.session.user);
        
        // Fetch profile data
        await fetchProfile(data.session.user.id);
      } else {
        // Fallback - try getSession instead
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session) {
          console.log("Session data: Found (fallback)", sessionData.session ? true : false);
          setSession(sessionData.session);
          setUser(sessionData.session.user);
          
          // Fetch profile data
          await fetchProfile(sessionData.session.user.id);
        } else {
          console.log("Session data: Not found");
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
      }
    } catch (err) {
      console.error('Error in refresh session:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setAuthStatusChecked(true);
    }
  };

  // Handle sign out - completely revamped for reliability
  const handleSignOut = async () => {
    try {
      // Clear all auth state
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      
      // Clear ALL possible token storage keys
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-auth-token');
      localStorage.removeItem('sb-auth-token-backup');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_id');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Force page reload to clear any in-memory state
      window.location.href = '/';
      
      return true;
    } catch (error) {
      console.error("Error signing out:", error);
      return false;
    }
  };

  // Initialize auth on component mount - once only
  useEffect(() => {
    const initializeAuth = async () => {
      // Start with loading state
      setIsLoading(true);
      console.log("AUTH INIT STARTED");
      
      try {
        // First check for admin status in localStorage for immediate UI response
        const savedAdminStatus = localStorage.getItem('user_is_admin');
        if (savedAdminStatus === 'true') {
          console.log("FOUND STORED ADMIN STATUS - SETTING TO TRUE");
          setIsAdmin(true);
        }
        
        // Get current session from Supabase - this should work with the properly configured client
        const { data } = await supabase.auth.getSession();
        
        if (data?.session) {
          console.log("VALID SESSION FOUND FROM SUPABASE");
          setSession(data.session);
          setUser(data.session.user);
          
          if (data.session.user?.id) {
            const profile = await fetchProfile(data.session.user.id);
            if (profile && profile.is_admin) {
              console.log("USER IS ADMIN FROM PROFILE");
              localStorage.setItem('user_is_admin', 'true');
            }
          }
        } else {
          // Clear auth state if no session found
          console.log("NO SESSION FOUND, CLEARING AUTH STATE");
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Auth error:", error);
        // Clear auth state on error
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      } finally {
        // Always finish loading
        setIsLoading(false);
        setAuthStatusChecked(true);
        console.log("AUTH INIT COMPLETE");
      }
    };

    // Run auth initialization
    initializeAuth();
  }, []);

  // Set up auth state change listener
  useEffect(() => {
    console.log("SETTING UP AUTH LISTENER");
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        console.log('Auth state changed:', event, newSession ? 'Session exists' : 'No session');
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log("SIGN IN OR TOKEN REFRESH EVENT");
          
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            
            if (newSession.user) {
              const profile = await fetchProfile(newSession.user.id);
              if (profile && profile.is_admin) {
                console.log("USER IS ADMIN FROM PROFILE");
                localStorage.setItem('user_is_admin', 'true');
              }
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("SIGN OUT EVENT");
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          localStorage.removeItem('user_is_admin');
        }
      }
    );

    return () => {
      console.log("CLEANING UP AUTH LISTENER");
      subscription.unsubscribe();
    };
  }, []);

  // Periodic session refresh
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (session) {
        handleRefreshSession();
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes
    
    return () => clearInterval(intervalId);
  }, [session]);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      isLoading, 
      error, 
      isAdmin, 
      refreshSession: handleRefreshSession,
      signOut: handleSignOut,
      authStatusChecked 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
