import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { getClientIp } from './ipTrackingService';

// Session ID management
let currentSessionId: string | null = null;

/**
 * Get or create a session ID for the current browser
 */
export const getSessionId = (): string => {
  if (!currentSessionId) {
    // Check localStorage first
    const storedSessionId = localStorage.getItem('app_session_id');
    if (storedSessionId) {
      currentSessionId = storedSessionId;
    } else {
      // Generate new session ID
      currentSessionId = uuidv4();
      localStorage.setItem('app_session_id', currentSessionId);
    }
  }
  return currentSessionId;
};

/**
 * Track user activity (call this periodically)
 * This updates the last_active timestamp for the user
 */
export const trackUserActivity = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    const sessionId = getSessionId();
    
    // Get client IP for more accurate tracking
    const ipAddress = await getClientIp();
    
    // Call our custom RPC that logs IP address
    await supabase.rpc('update_user_last_active_with_ip', { 
      p_user_id: userId, 
      p_session_id: sessionId,
      p_ip_address: ipAddress,
      p_user_agent: window.navigator.userAgent
    });
    
    console.log('User activity tracked successfully');
  } catch (error) {
    console.error('Error tracking user activity:', error);
    // Fallback to original function if the custom one fails
    try {
      const sessionId = getSessionId();
      await supabase.rpc('update_user_last_active', { 
        p_user_id: userId, 
        p_session_id: sessionId 
      });
    } catch (fbError) {
      console.error('Fallback tracking also failed:', fbError);
    }
  }
};

/**
 * Track when user views a page
 */
export const trackPageView = async (userId: string, pagePath: string): Promise<void> => {
  if (!userId) return;
  
  try {
    // Get client IP for more accurate tracking
    const ipAddress = await getClientIp();
    
    // Call our custom RPC that includes IP address (with debug logs)
    console.log('[trackPageView] RPC params:', {
      p_user_id: userId,
      p_page_path: pagePath,
      p_session_id: getSessionId(),
      p_ip_address: ipAddress,
      p_user_agent: window.navigator.userAgent
    });
    const { data, error } = await supabase.rpc('track_page_view_with_ip', {
      p_user_id: userId,
      p_page_path: pagePath,
      p_session_id: getSessionId(),
      p_ip_address: ipAddress,
      p_user_agent: window.navigator.userAgent
    });
    console.log('[trackPageView] RPC response:', { data, error });
    if (error) throw error;
  } catch (error) {
    console.error('Error tracking page view with IP:', error);
    // Fallback to original function if the custom one fails
    try {
      await supabase.rpc('track_page_view', {
        p_user_id: userId,
        p_page_path: pagePath,
        p_session_id: getSessionId()
      });
    } catch (fbError) {
      console.error('Fallback page view tracking also failed:', fbError);
    }
  }
};

/**
 * End user session (call on logout)
 */
export const endUserSession = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    const sessionId = getSessionId();
    // Get client IP for more accurate tracking
    const ipAddress = await getClientIp();
    
    // Call our custom RPC that includes IP address
    await supabase.rpc('end_user_session_with_ip', { 
      p_user_id: userId, 
      p_session_id: sessionId,
      p_ip_address: ipAddress,
      p_user_agent: window.navigator.userAgent
    });
    
    // Clear session
    localStorage.removeItem('app_session_id');
    currentSessionId = null;
  } catch (error) {
    console.error('Error ending user session with IP:', error);
    // Fallback to original function if the custom one fails
    try {
      const sessionId = getSessionId();
      await supabase.rpc('end_user_session', { 
        p_user_id: userId, 
        p_session_id: sessionId 
      });
      localStorage.removeItem('app_session_id');
      currentSessionId = null;
    } catch (fbError) {
      console.error('Fallback session ending also failed:', fbError);
    }
  }
};
