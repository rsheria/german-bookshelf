import { supabase } from './supabase';
import { getClientIp } from './ipTrackingService';

export interface ActivityLog {
  id: string;
  user_id: string;
  username: string;
  action: string;
  entity_id?: string;
  entity_type?: string;
  entity_name?: string;
  details?: Record<string, any>;
  created_at: string;
  ip_address?: string;
}

// Activity types for type safety
export enum ActivityType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  DOWNLOAD = 'DOWNLOAD',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  BOOK_REQUEST = 'BOOK_REQUEST',
  ADMIN_ACTION = 'ADMIN_ACTION',
  PAGE_VIEW = 'page_view'
}

/**
 * Log a user activity manually (most activities are logged via database triggers)
 */
export const logUserActivity = async (
  userId: string,
  action: ActivityType | string,
  entityId?: string,
  entityType?: string,
  entityName?: string,
  details?: Record<string, any>
): Promise<string | null> => {
  try {
    // Get the client IP for more accurate tracking
    const ipAddress = await getClientIp();
    const userAgent = window.navigator.userAgent;
    
    // Use our new function that includes IP address tracking
    console.log('[logUserActivity] RPC params:', {
      p_user_id: userId,
      p_action: action,
      p_entity_id: entityId,
      p_entity_type: entityType,
      p_entity_name: entityName,
      p_details: details ? JSON.stringify(details) : null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });
    const { data, error } = await supabase.rpc('log_user_activity_with_type', {
      p_user_id: userId,
      p_action: action,
      p_entity_id: entityId ?? null,
      p_entity_type: entityType ?? null,
      p_entity_name: entityName ?? null,
      p_details: details ? JSON.stringify(details) : null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });
    console.log('[logUserActivity] RPC response:', { data, error });
    if (error) {
      console.error('Error logging activity with IP:', error);
      // Fall back to the original function if the new one fails
      try {
        const { data: fallbackData } = await supabase.rpc('log_user_activity', {
          p_user_id: userId,
          p_action: action,
          p_entity_id: entityId ?? null,
          p_entity_type: entityType ?? null,
          p_entity_name: entityName ?? null,
          p_details: details ? JSON.stringify(details) : null,
          p_ip_address: null
        });
        return fallbackData;
      } catch (fbError) {
        console.error('Fallback activity logging also failed:', fbError);
        return null;
      }
    }

    return data;
  } catch (error) {
    console.error('Exception logging activity:', error);
    return null;
  }
};

/**
 * Get recent user activities (for admin dashboard)
 */
export const getRecentActivities = async (limit = 10): Promise<ActivityLog[]> => {
  try {
    // Try to use our optimized function first
    const { data, error } = await supabase.rpc('get_recent_activity', { 
      limit_count: limit 
    });

    if (error) {
      console.error('Error fetching recent activities with optimized function:', error);
      // Fall back to direct table query if the function fails
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (fallbackError) {
          console.error('Fallback query for recent activities failed:', fallbackError);
          return [];
        }
        
        return fallbackData || [];
      } catch (fbError) {
        console.error('Exception in fallback query for recent activities:', fbError);
        return [];
      }
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching recent activities:', error);
    return [];
  }
};

/**
 * Get user activities for a specific user
 */
export const getUserActivities = async (userId: string, limit = 20): Promise<ActivityLog[]> => {
  try {
    // Directly query activity_logs for the given user
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Exception fetching user activities:', error);
    return [];
  }
};

/**
 * Get activity statistics for the admin dashboard
 */
export const getActivityStats = async (): Promise<{
  today: number;
  week: number;
  month: number;
  byAction: Record<string, number>;
}> => {
  try {
    // Use the optimized function that returns all stats as JSON
    const { data, error } = await supabase.rpc('get_activity_stats');
    
    if (error) {
      console.error('Error fetching activity stats with optimized function:', error);
      // Fall back to the original implementation
      return fallbackGetActivityStats();
    }
    
    return data || { today: 0, week: 0, month: 0, byAction: {} };
  } catch (error) {
    console.error('Exception fetching activity stats:', error);
    return fallbackGetActivityStats();
  }
};

// Fallback implementation for activity stats
const fallbackGetActivityStats = async (): Promise<{
  today: number;
  week: number;
  month: number;
  byAction: Record<string, number>;
}> => {
  try {
    // Get today's activity count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayCount } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    
    // Get week's activity count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: weekCount } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());
    
    // Get month's activity count
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const { count: monthCount } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());
    
    // Get actions breakdown
    const { data } = await supabase
      .from('activity_logs')
      .select('action')
      .order('created_at', { ascending: false });
    
    // Count occurrences of each action
    const actionCounts: Record<string, number> = {};
    if (data) {
      data.forEach(item => {
        const action = item.action;
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      });
    }
    
    return {
      today: todayCount || 0,
      week: weekCount || 0,
      month: monthCount || 0,
      byAction: actionCounts
    };
  } catch (error) {
    console.error('Exception in fallback activity stats:', error);
    return {
      today: 0,
      week: 0,
      month: 0,
      byAction: {}
    };
  }
};

/**
 * Get user login history (last login times by user)
 */
export const getUserLoginHistory = async (limit = 20): Promise<ActivityLog[]> => {
  try {
    // Try to use our optimized function first
    const { data, error } = await supabase.rpc('get_user_login_history', { 
      limit_count: limit 
    });

    if (error) {
      console.error('Error fetching login history with optimized function:', error);
      // Fall back to direct table query if the function fails
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('activity_logs')
          .select('*')
          .ilike('action', ActivityType.LOGIN)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (fallbackError) {
          console.error('Fallback query for login history failed:', fallbackError);
          return [];
        }
        
        return fallbackData || [];
      } catch (fbError) {
        console.error('Exception in fallback query for login history:', fbError);
        return [];
      }
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching login history:', error);
    return [];
  }
};

/**
 * Get the user's last login timestamp
 */
export const getUserLastLogin = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('created_at')
      .eq('user_id', userId)
      .ilike('action', ActivityType.LOGIN)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) {
      console.error('Error fetching last login:', error);
      return null;
    }
    return data?.created_at || null;
  } catch (error) {
    console.error('Exception fetching last login:', error);
    return null;
  }
};
