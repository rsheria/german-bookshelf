import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSession } from '../services/supabase';
import { getSupabaseClient } from '../utils/supabaseHelpers';
import { Profile } from '../types/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Initial session check
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const { data } = await getSession();
        setSession(data.session);
        setUser(data.session?.user || null);

        if (data.session?.user) {
          // Fetch user profile
          const supabaseClient = getSupabaseClient();
          
          // Only try to fetch profile if Supabase is configured
          if (supabaseClient) {
            const { data: profileData, error } = await supabaseClient
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single();

            if (error) {
              console.error('Error fetching profile:', error);
            } else {
              setProfile(profileData);
              setIsAdmin(profileData.is_admin);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const supabaseClient = getSupabaseClient();
    
    // Only set up auth listener if Supabase is configured
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (supabaseClient) {
      const { data } = supabaseClient.auth.onAuthStateChange(
        async (_, newSession) => {
          setSession(newSession);
          setUser(newSession?.user || null);

          if (newSession?.user) {
            // Fetch user profile on auth change
            const { data: profileData, error } = await supabaseClient
              .from('profiles')
              .select('*')
              .eq('id', newSession.user.id)
              .single();

            if (error) {
              console.error('Error fetching profile:', error);
            } else {
              setProfile(profileData);
              setIsAdmin(profileData.is_admin);
            }
          } else {
            setProfile(null);
            setIsAdmin(false);
          }
        }
      );
      
      subscription = data.subscription;
    }

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
