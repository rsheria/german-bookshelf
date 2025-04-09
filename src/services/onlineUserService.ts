import { supabase } from './supabase';
import { UserSession, OnlineUser } from '../types/supabase';
import { v4 as uuidv4 } from 'uuid'; // You may need to install this package

// Session ID management - allows us to track individual browser sessions
let currentSessionId: string | null = null;

/**
 * Initialize or retrieve the current session ID
 */
export const getSessionId = (): string => {
  if (!currentSessionId) {
    // Check if we have a stored session ID in localStorage
    const storedSessionId = localStorage.getItem('app_session_id');
    if (storedSessionId) {
      currentSessionId = storedSessionId;
    } else {
      // Generate a new session ID
      currentSessionId = uuidv4();
      localStorage.setItem('app_session_id', currentSessionId);
    }
  }
  return currentSessionId;
};

/**
 * Update user's last active timestamp (call this periodically when user is active)
 */
export const updateUserLastActive = async (userId: string): Promise<void> => {
  try {
    const sessionId = getSessionId();
    await supabase.rpc('update_user_last_active', { 
      user_id: userId, 
      session_id: sessionId 
    });
  } catch (error) {
    console.error('Error updating user last active time:', error);
  }
};

/**
 * End the current user session (call on logout)
 */
export const endUserSession = async (userId: string): Promise<void> => {
  try {
    const sessionId = getSessionId();
    await supabase.rpc('end_user_session', { 
      user_id: userId, 
      session_id: sessionId 
    });
    
    // Clear the session ID from local storage
    localStorage.removeItem('app_session_id');
    currentSessionId = null;
  } catch (error) {
    console.error('Error ending user session:', error);
  }
};

/**
 * Get users currently online (active in last 15 minutes)
 */
export const getOnlineUsers = async (): Promise<OnlineUser[]> => {
  try {
    // Use the function that returns the complete set of online users
    const { data, error } = await supabase.rpc('get_online_users');
    
    if (error) {
      console.error('Error fetching online users:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching online users:', error);
    return [];
  }
};

/**
 * Get all user sessions with pagination
 */
export const getUserSessions = async (
  page = 0, 
  limit = 20, 
  activeOnly = true,
  userId?: string
): Promise<{ data: UserSession[], count: number }> => {
  try {
    let query = supabase
      .from('user_sessions')
      .select('*', { count: 'exact' });
    
    // Filter by active status if needed
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    // Filter by user ID if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    // Apply pagination
    query = query
      .order('last_active_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    
    const { data, count, error } = await query;
    
    if (error) {
      console.error('Error fetching user sessions:', error);
      return { data: [], count: 0 };
    }
    
    return { 
      data: data || [], 
      count: count || 0 
    };
  } catch (error) {
    console.error('Exception fetching user sessions:', error);
    return { data: [], count: 0 };
  }
};

/**
 * Get session statistics
 */
export const getSessionStats = async (): Promise<{
  activeUsers: number;
  activeSessions: number;
  totalSessions: number;
}> => {
  try {
    // Use the optimized function that returns all stats at once
    const { data, error } = await supabase.rpc('get_session_stats');
    
    if (error) {
      console.error('Error fetching session stats:', error);
      return {
        activeUsers: 0,
        activeSessions: 0,
        totalSessions: 0
      };
    }
    
    return {
      activeUsers: data?.active_users || 0,
      activeSessions: data?.last_hour_sessions || 0,
      totalSessions: data?.total_sessions || 0
    };
  } catch (error) {
    console.error('Exception fetching session stats:', error);
    // Fallback to individual queries if the optimized function fails
    try {
      // Count active users (distinct)
      const { data: onlineUsers } = await supabase.rpc('get_online_users');
      
      // Count active sessions
      const { count: activeSessions } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Count total sessions
      const { count: totalSessions } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true });
      
      return {
        activeUsers: onlineUsers?.length || 0,
        activeSessions: activeSessions || 0,
        totalSessions: totalSessions || 0
      };
    } catch (fbError) {
      console.error('Even fallback session stats failed:', fbError);
      return {
        activeUsers: 0,
        activeSessions: 0,
        totalSessions: 0
      };
    }
  }
};
