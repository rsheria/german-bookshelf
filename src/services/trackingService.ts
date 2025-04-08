import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

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
    await supabase.rpc('update_user_last_active', { 
      p_user_id: userId, 
      p_session_id: sessionId 
    });
    console.log('User activity tracked successfully');
  } catch (error) {
    console.error('Error tracking user activity:', error);
  }
};

/**
 * Track when user views a page
 */
export const trackPageView = async (userId: string, pagePath: string): Promise<void> => {
  if (!userId) return;
  
  try {
    await supabase.rpc('track_page_view', {
      p_user_id: userId,
      p_page_path: pagePath,
      p_session_id: getSessionId()
    });
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

/**
 * End user session (call on logout)
 */
export const endUserSession = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    const sessionId = getSessionId();
    await supabase.rpc('end_user_session', { 
      p_user_id: userId, 
      p_session_id: sessionId 
    });
    
    // Clear session
    localStorage.removeItem('app_session_id');
    currentSessionId = null;
  } catch (error) {
    console.error('Error ending user session:', error);
  }
};
