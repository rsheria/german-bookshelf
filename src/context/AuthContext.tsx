import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, getSession } from '../services/supabase';
import { Profile } from '../types/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  refreshSession: () => Promise<void>;
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

  const refreshSession = async () => {
    try {
      const result = await getSession();
      
      // Handle potential errors from getSession
      if ('error' in result && result.error) {
        throw result.error;
      }

      if (result.data.session?.user) {
        // Fetch user profile
        if (supabase) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', result.data.session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.warn('Error fetching profile:', profileError);
          }

          setSession(result.data.session);
          setUser(result.data.session.user);
          setProfile(profileData || null);
        } else {
          console.warn('Supabase client not initialized, cannot fetch profile');
          setSession(result.data.session);
          setUser(result.data.session.user);
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
      setError(err as Error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        await refreshSession();
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (newSession?.user && supabase) {
          // Fetch user profile
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newSession.user.id)
              .single();

            if (profileError && profileError.code !== 'PGRST116') {
              console.warn('Error fetching profile:', profileError);
            }

            setProfile(profileData || null);
          } catch (err) {
            console.error('Error fetching profile on auth change:', err);
          }
        } else {
          setProfile(null);
        }
      });
      
      subscription = data.subscription;
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Set up a timer to refresh the session periodically to prevent timeouts
  useEffect(() => {
    // Refresh every 10 minutes
    const intervalId = setInterval(() => {
      console.log('Refreshing session...');
      refreshSession();
    }, 10 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, error, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};
