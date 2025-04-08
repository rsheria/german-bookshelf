import { supabase } from './supabase';
import { UserBan } from '../types/supabase';
import { logUserActivity, ActivityType } from './activityService';

/**
 * Check if a user is banned
 */
export const isUserBanned = async (userId: string, ipAddress?: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('is_user_banned', { 
        check_user_id: userId, 
        check_ip: ipAddress || '' 
      });
    
    if (error) {
      console.error('Error checking if user is banned:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Exception checking if user is banned:', error);
    return false;
  }
};

/**
 * Ban a user
 */
export const banUser = async (
  adminId: string,
  userId?: string,
  ipAddress?: string,
  reason?: string,
  expiresAt?: Date
): Promise<string | null> => {
  try {
    // Validate inputs - ensure at least one of userId or ipAddress is provided
    if (!userId && !ipAddress) {
      console.error('Ban failed: Either userId or ipAddress must be provided');
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_bans')
      .insert([
        {
          user_id: userId,
          ip_address: ipAddress,
          reason: reason,
          banned_by: adminId,
          expires_at: expiresAt?.toISOString(),
          is_active: true
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error banning user:', error);
      return null;
    }

    // Log the admin action
    if (userId) {
      await logUserActivity(
        adminId,
        ActivityType.ADMIN_ACTION,
        userId,
        'user',
        undefined, // entity_name
        { 
          action: 'ban_user',
          reason: reason,
          expires_at: expiresAt?.toISOString()
        }
      );
    } else if (ipAddress) {
      await logUserActivity(
        adminId,
        ActivityType.ADMIN_ACTION,
        ipAddress,
        'ip_address',
        undefined, // entity_name
        { 
          action: 'ban_ip',
          reason: reason,
          expires_at: expiresAt?.toISOString()
        }
      );
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Exception banning user:', error);
    return null;
  }
};

/**
 * Unban a user
 */
export const unbanUser = async (
  adminId: string,
  banId: string
): Promise<boolean> => {
  try {
    // First get the ban details for logging
    const { data: banData, error: getBanError } = await supabase
      .from('user_bans')
      .select('*')
      .eq('id', banId)
      .single();
    
    if (getBanError) {
      console.error('Error getting ban details:', getBanError);
      return false;
    }
    
    // Update the ban to inactive
    const { error } = await supabase
      .from('user_bans')
      .update({ is_active: false })
      .eq('id', banId);
    
    if (error) {
      console.error('Error unbanning user:', error);
      return false;
    }

    // Log the admin action
    if (banData?.user_id) {
      await logUserActivity(
        adminId,
        ActivityType.ADMIN_ACTION,
        banData.user_id,
        'user',
        undefined, // entity_name
        { 
          action: 'unban_user'
        }
      );
    } else if (banData?.ip_address) {
      await logUserActivity(
        adminId,
        ActivityType.ADMIN_ACTION,
        banData.ip_address,
        'ip_address',
        undefined, // entity_name
        { 
          action: 'unban_ip'
        }
      );
    }
    
    return true;
  } catch (error) {
    console.error('Exception unbanning user:', error);
    return false;
  }
};

/**
 * Get active bans for a user
 */
export const getUserBans = async (userId: string): Promise<UserBan[]> => {
  try {
    const { data, error } = await supabase
      .from('user_bans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('banned_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user bans:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching user bans:', error);
    return [];
  }
};

/**
 * Get all bans with pagination
 */
export const getAllBans = async (
  page = 0,
  limit = 20,
  includeInactive = false,
  searchTerm = ''
): Promise<{ data: UserBan[], count: number }> => {
  try {
    let query = supabase
      .from('user_bans')
      .select('*', { count: 'exact' });
    
    // Filter by active status if needed
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(
        `user_id.eq.${searchTerm},ip_address.ilike.%${searchTerm}%,reason.ilike.%${searchTerm}%`
      );
    }
    
    // Apply pagination
    query = query
      .order('banned_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    
    const { data, count, error } = await query;
    
    if (error) {
      console.error('Error fetching all bans:', error);
      return { data: [], count: 0 };
    }
    
    return { 
      data: data || [], 
      count: count || 0 
    };
  } catch (error) {
    console.error('Exception fetching all bans:', error);
    return { data: [], count: 0 };
  }
};

/**
 * Get bans by IP address
 */
export const getBansByIp = async (ipAddress: string): Promise<UserBan[]> => {
  try {
    const { data, error } = await supabase
      .from('user_bans')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('is_active', true)
      .order('banned_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching bans by IP:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching bans by IP:', error);
    return [];
  }
};
