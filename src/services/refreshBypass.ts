import { supabase } from './supabase';

/**
 * Direct bypass for refresh issues 
 * This function forces a re-login using stored credentials when refresh fails
 */
export const bypassRefreshIssue = async (): Promise<boolean> => {
  try {
    console.log("🔄 Bypass: Attempting to recover from refresh token failure");
    
    // Check if we have credentials in localStorage
    const email = localStorage.getItem('auth_email');
    const hashedPassword = localStorage.getItem('auth_password_hash');
    
    if (!email || !hashedPassword) {
      console.log("🔄 Bypass: No stored credentials found");
      return false;
    }
    
    // First try to get the session using Supabase
    const { data: sessionData } = await supabase.auth.getSession();
    
    // If we already have a valid session, no need to proceed
    if (sessionData?.session?.user) {
      console.log("🔄 Bypass: Valid session found, no need for bypass");
      return true;
    }
    
    // No valid session, try to sign in again using stored credentials
    console.log("🔄 Bypass: No valid session, attempting auto re-login");
    
    // Decode the hashed password
    const decodedPassword = atob(hashedPassword);
    
    // Try to sign in again
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: decodedPassword,
    });
    
    if (error) {
      console.error("🔄 Bypass: Error during auto re-login:", error);
      return false;
    }
    
    if (data?.session) {
      console.log("🔄 Bypass: Successfully re-authenticated!");
      
      // Store admin status if needed
      if (data.session.user?.app_metadata?.is_admin) {
        localStorage.setItem('user_is_admin', 'true');
      }
      
      // Force page reload to apply the new session
      window.location.reload();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("🔄 Bypass: Fatal error during refresh bypass:", error);
    return false;
  }
};

/**
 * Store credentials in a secure way for later bypass
 */
export const storeCredentials = (email: string, password: string): void => {
  // Store email directly
  localStorage.setItem('auth_email', email);
  
  // Store password with base64 encoding (not truly secure but better than plaintext)
  localStorage.setItem('auth_password_hash', btoa(password));
  
  console.log("🔄 Credentials stored for potential bypass");
};
