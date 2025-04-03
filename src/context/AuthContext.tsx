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
  
  // Function to fetch user's profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log("Profile not found, creating a new one...");
          
          // Create a default profile
          try {
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                username: user?.email,
                is_admin: false,
                daily_quota: 3
              })
              .select()
              .single();
            
            if (insertError) {
              console.error("Error creating profile:", insertError);
            } else {
              console.log("Created new profile:", newProfile);
              setProfile(newProfile);
              setIsAdmin(newProfile.is_admin || false);
            }
          } catch (err) {
            console.error("Exception creating profile:", err);
          }
        } else {
          console.error("Profile fetch error:", profileError);
        }
      } else if (profileData) {
        console.log("Profile found:", profileData);
        setProfile(profileData);
        setIsAdmin(profileData.is_admin || false);
      }
    } catch (err) {
      console.error("Profile fetch exception:", err);
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

  // Initialize auth on component mount - once only
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      console.log("Initializing auth state...");
      
      try {
        // First try getting the current session directly
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session) {
          console.log("✅ Active session found from supabase.auth.getSession()");
          setSession(sessionData.session);
          setUser(sessionData.session.user);
          
          // Store session redundantly to ensure persistence
          localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData.session));
          localStorage.setItem('sb-auth-token-backup', JSON.stringify(sessionData.session));
          
          if (sessionData.session.user?.id) {
            await fetchProfile(sessionData.session.user.id);
          }
          setIsLoading(false);
          setAuthStatusChecked(true);
          return;
        }
        
        // If no current session, try our persisted session
        console.log("No active session, checking local storage...");
        const persistedSession = localStorage.getItem('supabase.auth.token') || 
                                 localStorage.getItem('sb-auth-token') ||
                                 localStorage.getItem('sb-auth-token-backup');
                                 
        if (persistedSession) {
          try {
            const parsedSession = JSON.parse(persistedSession);
            console.log("Found persisted session, checking if valid...");
            
            if (parsedSession && !isSessionExpired(parsedSession)) {
              console.log("✅ Using valid persisted session");
              
              // Try to restore the session with supabase
              try {
                await supabase.auth.setSession({
                  access_token: parsedSession.access_token,
                  refresh_token: parsedSession.refresh_token || '',
                });
                console.log("Session restored successfully");
                
                // Get the restored session
                const { data: restoredData } = await supabase.auth.getSession();
                if (restoredData?.session) {
                  setSession(restoredData.session);
                  setUser(restoredData.session.user);
                  
                  // Update storage with fresh session
                  localStorage.setItem('supabase.auth.token', JSON.stringify(restoredData.session));
                  localStorage.setItem('sb-auth-token-backup', JSON.stringify(restoredData.session));
                  
                  if (restoredData.session.user?.id) {
                    await fetchProfile(restoredData.session.user.id);
                  }
                  setIsLoading(false);
                  setAuthStatusChecked(true);
                  return;
                }
              } catch (e) {
                console.error("❌ Error restoring session:", e);
              }
            } else {
              console.log("⚠️ Persisted session is expired or invalid");
            }
          } catch (e) {
            console.error("❌ Error parsing persisted session:", e);
          }
        }
        
        // Last resort - try regular refresh
        console.log("Trying session refresh as last resort...");
        await handleRefreshSession();
      } catch (error) {
        console.error("❌ Critical auth error:", error);
        setIsLoading(false);
        setAuthStatusChecked(true);
      }
    };
    
    // Check if a session is expired
    const isSessionExpired = (session: any): boolean => {
      if (!session.expires_at) return false;
      const expiryTime = new Date(session.expires_at * 1000);
      return expiryTime < new Date();
    };

    // Add a safety timeout to ensure auth always completes
    const safetyTimer = setTimeout(() => {
      console.log("Auth safety timeout triggered - forcing completion");
      setIsLoading(false);
      setAuthStatusChecked(true);
    }, 3000); // 3 second safety timeout

    initializeAuth();
    
    return () => clearTimeout(safetyTimer);
  }, []);

  // Set up auth state change listener
  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        console.log('Auth state changed:', event, newSession ? 'Session exists' : 'No session');
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsLoading(true);
          
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            
            // Save session to localStorage as a backup
            localStorage.setItem('supabase.auth.token', JSON.stringify(newSession));
            localStorage.setItem('sb-auth-token-backup', JSON.stringify(newSession));
            
            // Fetch profile
            if (newSession.user) {
              await fetchProfile(newSession.user.id);
            }
          } else {
            // Try to refresh
            await handleRefreshSession();
          }
          
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          
          // Clear local storage
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('supabase.auth.token.v2');
          localStorage.removeItem('sb-auth-token-backup');
          
          setIsLoading(false);
        }
      }
    );

    return () => {
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
      authStatusChecked 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
