import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

/**
 * A hook to ensure session persistence across page refreshes
 * This adds multiple layers of protection to prevent session loss
 */
export const useSessionPersistence = () => {
  const { user, session, refreshSession } = useAuth();
  
  // Check session health and refresh when needed
  useEffect(() => {
    const checkSessionHealth = async () => {
      if (!session) return;
      
      // Store session in multiple locations for redundancy
      try {
        // Standard session storage
        localStorage.setItem('supabase.auth.token', JSON.stringify(session));
        
        // Backup session storage
        localStorage.setItem('sb-auth-token-backup', JSON.stringify(session));
        
        // Custom session details for recovery
        if (session.access_token) {
          localStorage.setItem('session_access_token', session.access_token);
        }
        if (session.refresh_token) {
          localStorage.setItem('session_refresh_token', session.refresh_token);
        }
        
        // Additional metadata
        if (user?.id) {
          localStorage.setItem('user_id', user.id);
          localStorage.setItem('user_email', user.email || '');
        }
      } catch (err) {
        console.error('Error saving session redundantly:', err);
      }
    };
    
    checkSessionHealth();
  }, [session, user]);
  
  // Restore session on visibility change (tab focus)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, verifying session...');
        
        try {
          // Get current session
          const { data } = await supabase.auth.getSession();
          
          if (!data.session) {
            console.log('Session lost, attempting recovery...');
            await refreshSession();
          }
        } catch (err) {
          console.error('Error in visibility change handler:', err);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSession]);
  
  // Additional periodic session refresh
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (user) {
        console.log('Periodic session refresh...');
        refreshSession();
      }
    }, 4 * 60 * 1000); // Refresh every 4 minutes
    
    return () => clearInterval(intervalId);
  }, [user, refreshSession]);
  
  return null; // This hook doesn't return anything
};
