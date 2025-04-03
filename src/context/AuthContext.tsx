import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createSupabaseClient } from '../services/supabase';
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

  // Simplified and more robust session refresh
  const refreshSession = async () => {
    try {
      console.log("Refreshing session...");
      const supabase = createSupabaseClient();
      
      if (!supabase) {
        console.error("Supabase client not available");
        setError(new Error("Supabase client not available"));
        setIsLoading(false);
        setAuthStatusChecked(true);
        return;
      }
      
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
          // Fetch profile with retry (but don't block auth completion)
          let profileData = null;
          
          // Try to get the profile data once
          const { data: fetchedProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
          
          if (fetchError) {
            if (fetchError.code === 'PGRST116') {
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
                  profileData = newProfile;
                }
              } catch (err) {
                console.error("Exception creating profile:", err);
              }
            } else {
              console.error("Profile fetch error:", fetchError);
            }
          } else {
            profileData = fetchedProfile;
          }
          
          if (profileData) {
            console.log("Profile found:", profileData);
            setProfile(profileData);
            setIsAdmin(profileData.is_admin || false);
          } else {
            console.warn("Could not find or create profile");
            setProfile(null);
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("Profile fetch exception:", err);
          // Continue with auth even if profile fetch fails
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
      // Always set these to ensure the app continues loading
      setIsLoading(false);
      setAuthStatusChecked(true);
    }
  };

  // Initialize auth on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        await refreshSession();
      } catch (error) {
        console.error("Critical auth error:", error);
        // Ensure the app loads even if auth completely fails
        setIsLoading(false);
        setAuthStatusChecked(true);
      }
    };

    // Add a safety timeout to ensure auth always completes
    const safetyTimer = setTimeout(() => {
      console.log("Safety timeout triggered - ensuring auth completes");
      setIsLoading(false);
      setAuthStatusChecked(true);
    }, 5000); // 5 second safety timeout

    initializeAuth();

    return () => clearTimeout(safetyTimer);
  }, []);

  // Set up auth state change listener
  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      // If no Supabase client, ensure auth status is marked checked
      setAuthStatusChecked(true);
      return;
    }
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event, newSession ? 'Session exists' : 'No session');
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsLoading(true);
          try {
            await refreshSession();
          } catch (error) {
            console.error("Auth state change error:", error);
            // Ensure loading completes even if refresh fails
            setIsLoading(false);
            setAuthStatusChecked(true);
          }
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
    const intervalId = setInterval(refreshSession, 5 * 60 * 1000);
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
      refreshSession,
      authStatusChecked 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
