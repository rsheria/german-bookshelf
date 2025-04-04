import { supabase } from './supabase';

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
  ADMIN_ACTION = 'ADMIN_ACTION'
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
    const { data, error } = await supabase.rpc('log_user_activity', {
      user_id: userId,
      action,
      entity_id: entityId,
      entity_type: entityType,
      entity_name: entityName,
      details: details ? JSON.stringify(details) : null,
      ip_address: null // Browser can't reliably get IP address
    });

    if (error) {
      console.error('Error logging activity:', error);
      return null;
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
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent activities:', error);
      return [];
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
    // Get today's activity count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayCount, error: todayError } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    
    if (todayError) {
      console.error('Error fetching today activity count:', todayError);
    }
    
    // Get week's activity count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: weekCount, error: weekError } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());
    
    if (weekError) {
      console.error('Error fetching week activity count:', weekError);
    }
    
    // Get month's activity count
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const { count: monthCount, error: monthError } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());
    
    if (monthError) {
      console.error('Error fetching month activity count:', monthError);
    }
    
    // Get count by action type - using a different approach
    // instead of "group by" which isn't directly supported in the TypeScript types
    const { data: actionData, error: actionError } = await supabase
      .rpc('get_activity_count_by_action');
    
    if (actionError) {
      console.error('Error fetching activity by action:', actionError);
    }
    
    const byAction: Record<string, number> = {};
    if (actionData) {
      actionData.forEach((item: { action: string; count: number }) => {
        byAction[item.action] = parseInt(item.count.toString());
      });
    }
    
    return {
      today: todayCount || 0,
      week: weekCount || 0,
      month: monthCount || 0,
      byAction
    };
  } catch (error) {
    console.error('Exception fetching activity stats:', error);
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
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('action', ActivityType.LOGIN)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching login history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching login history:', error);
    return [];
  }
};
