import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

/**
 * A hook to check session status and handle refresh cases
 * Use this in protected pages to ensure session is maintained on refresh
 */
export const useSessionCheck = (redirectPath = '/login') => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Checking session status...');
        
        // First try the standard session check
        const { data } = await supabase.auth.getSession();
        
        if (data?.session) {
          console.log('Session is valid');
          return; // Session exists, no need to do anything
        }
        
        // If we don't have a session, try to restore from localStorage tokens
        console.log('No session, attempting to restore from tokens...');
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (accessToken && refreshToken) {
          try {
            // Try to restore the session
            const { data: restored, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              console.error('Failed to restore session:', error);
              // Clear tokens since they're invalid
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user_id');
              navigate(redirectPath);
              return;
            }
            
            if (restored.session) {
              console.log('Session successfully restored!');
              return;
            }
          } catch (e) {
            console.error('Error restoring session:', e);
          }
        }
        
        // If we get here, we failed to restore the session
        console.log('Session restoration failed, redirecting to login');
        navigate(redirectPath);
      } catch (err) {
        console.error('Session check error:', err);
        navigate(redirectPath);
      }
    };
    
    checkSession();
  }, [navigate, redirectPath]);
  
  return null;
};
