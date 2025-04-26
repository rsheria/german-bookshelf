import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, signUp, signIn } from '../services/supabase';
import { setUserFromSupabase, isLoggedIn as isLocalLoggedIn, getCurrentUser, clearAuthData, initializeLocalAuth } from '../services/localAuth';
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
  useEffect(() => {
    // This function uses triple-redundancy session management
    const initializeAuth = async () => {
      console.log('Initializing auth state with fail-proof backup system...');
      setIsLoading(true);
      setAuthStatusChecked(false);
      
      // Helper function to check if user still exists in Supabase
      const verifyUserExists = async (userId: string): Promise<boolean> => {
        try {
          // Try to fetch the user's profile from the database
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
      };
      
      try {
        // COMPLETELY NEW APPROACH: First check if we have local auth data
        if (isLocalLoggedIn()) {
          console.log(' LOCAL AUTH: User is already logged in based on local data');
          const localUser = getCurrentUser();
          
          if (localUser) {
            // IMPORTANT: Verify the user still exists in Supabase before proceeding
            const userExists = await verifyUserExists(localUser.id);
            if (!userExists) {
              console.log('User was deleted from Supabase, clearing local auth...');
              clearAuthData();
              setUser(null);
              setSession(null);
              setProfile(null);
              setIsAdmin(false);
              setIsLoading(false);
              setAuthStatusChecked(true);
              return;
            }
            
            // User exists, we can use local data to prevent loading state
            setIsAdmin(localUser.isAdmin);
            
            // Attempt to get Supabase session in the background
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
              console.log(' Supabase session synchronized with local auth');
              setSession(data.session);
              setUser(data.session.user);
              
              // Try to fetch profile data if we have a user
              try {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', data.session.user.id)
                  .single();
                  
                if (profileData) {
                  setProfile(profileData);
                }
              } catch (profileError) {
                console.error('Error fetching profile:', profileError);
              }
            } else {
              // If Supabase session is gone but we have local data,
              // create a synthetic user object from local data
              console.log(' Using synthetic user from local data');
              setUser({
                id: localUser.id,
                email: localUser.email,
                user_metadata: { username: localUser.username },
                app_metadata: { is_admin: localUser.isAdmin },
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                role: 'authenticated',
                confirmed_at: new Date().toISOString()
              } as unknown as User);
            }
            
            // Important: We've already handled the auth state, so exit early
            setIsLoading(false);
            setAuthStatusChecked(true);
            return;
          }
        }
        
        // Regular path - attempt to get session from Supabase
        const { data } = await supabase.auth.getSession();
        const sessionData = data?.session;
        
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
          
          // IMPORTANT: Also save to our local auth system
          setUserFromSupabase(sessionData.user, !!isUserAdmin);
        } else {
          console.log('No active session found');
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
          
          // Clear local auth data
          clearAuthData();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setError(error instanceof Error ? error : new Error(String(error)));
        
        // LAST RESORT FALLBACK: If we have local auth data, verify user still exists
        if (isLocalLoggedIn()) {
          const localUser = getCurrentUser();
          if (localUser) {
            // Verify the user still exists in Supabase
            const userExists = await verifyUserExists(localUser.id);
            if (!userExists) {
              console.log('User was deleted from Supabase, clearing local auth...');
              clearAuthData();
              setUser(null);
              setSession(null);
              setProfile(null);
              setIsAdmin(false);
              return;
            }
            
            console.log(' LAST RESORT: Using local auth data after error');
            setIsAdmin(localUser.isAdmin);
            setUser({
              id: localUser.id,
              email: localUser.email,
              user_metadata: { username: localUser.username },
              app_metadata: { is_admin: localUser.isAdmin },
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              role: 'authenticated',
              confirmed_at: new Date().toISOString()
            } as unknown as User);
          }
        } else {
          // Reset auth state if no local data
          console.log('No local auth data available after error');
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } finally {
        setIsLoading(false);
        setAuthStatusChecked(true);
        console.log('Auth initialization complete');
      }
    };

    // Call the initialization function
    initializeAuth();
    
    // Initialize local auth system
    console.log('Starting local auth system...');
    initializeLocalAuth();
  }, []);

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
      setIsAdmin(false);
    }
  };

  // Implement the refreshSession function required by the interface
  const refreshSession = async () => {
    try {
      console.log('Manually refreshing session...');
      const { data } = await supabase.auth.getSession();
      const refreshedSession = data?.session;
      
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

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        throw error;
      }
      if (data.session) {
        // Successfully logged in - set all state immediately
        setUser(data.session.user);
        setSession(data.session);
        
        // Set admin status
        const isUserAdmin = data.session.user?.app_metadata?.is_admin === true;
        setIsAdmin(isUserAdmin);
        
        // Immediately save to local auth system
        setUserFromSupabase(data.session.user, isUserAdmin);
        
        // Log the login activity in our tracking system
        try {
          await logUserActivity(data.session.user.id, ActivityType.LOGIN);
          console.log('Login activity tracked successfully');
        } catch (trackError) {
          console.error('Error tracking login:', trackError);
        }
        
        // Show success toast or notification here if needed
        console.log('Login successful - all auth states updated');
        
        // Try to fetch profile in the background
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
            
          if (profileData) {
            setProfile(profileData);
          }
        } catch (profileError) {
          console.error('Error fetching profile after login:', profileError);
        }
      }
      return { data, error: null };
    } catch (loginError) {
      console.error('Error logging in:', loginError);
      const typedError = loginError instanceof Error ? loginError : new Error(String(loginError));
      setError(typedError);
      return { data: null, error: typedError };
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const { data, error } = await signUp(email, password);
      if (error) {
        throw error;
      }
      if (data.session) {
        setUser(data.session.user);
        setSession(data.session);
        setIsAdmin(data.session.user?.app_metadata?.is_admin === true);
      }
      return { data, error: null };
    } catch (signupError) {
      console.error('Error signing up:', signupError);
      const typedError = signupError instanceof Error ? signupError : new Error(String(signupError));
      setError(typedError);
      return { data: null, error: typedError };
    }
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (logoutError) {
      console.error('Error logging out:', logoutError);
      const typedError = logoutError instanceof Error ? logoutError : new Error(String(logoutError));
      setError(typedError);
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
