import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
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

  // Function to refresh session and fetch profile
  const handleRefreshSession = async () => {
    try {
      console.log("Refreshing session...");
      
      // Get current session
      const { data, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session refresh error:", sessionError);
        setError(sessionError);
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        setAuthStatusChecked(true);
        return;
      }

      console.log("Session data:", data?.session ? "Found" : "Not found");
      
      if (data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        
        try {
          // Fetch profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
          
          if (profileError) {
            if (profileError.code === 'PGRST116') {
              console.log("Profile not found, creating a new one...");
              
              // Try to create a profile
              try {
                const { data: newProfile, error: insertError } = await supabase
                  .from('profiles')
                  .insert({
                    id: data.session.user.id,
                    username: data.session.user.email,
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
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Error in refresh session:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setAuthStatusChecked(true);
    }
  };

  // Initialize auth on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        await handleRefreshSession();
      } catch (error) {
        console.error("Critical auth error:", error);
        setIsLoading(false);
        setAuthStatusChecked(true);
      }
    };

    // Add a safety timeout to ensure auth always completes
    const safetyTimer = setTimeout(() => {
      console.log("Auth safety timeout triggered - forcing completion");
      setIsLoading(false);
      setAuthStatusChecked(true);
    }, 2000); // 2 second safety timeout

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
          await handleRefreshSession();
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
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
    const intervalId = setInterval(handleRefreshSession, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

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
