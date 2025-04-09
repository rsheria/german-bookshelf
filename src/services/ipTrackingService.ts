import { supabase } from './supabase';
import { IpLog } from '../types/supabase';
import axios from 'axios';

/**
 * Get the client's IP address using an external service
 * This provides more accurate IP data than relying on Supabase headers
 */
export const getClientIp = async (): Promise<string> => {
  try {
    // Using ipify API - a free service to get client IP
    const response = await axios.get('https://api.ipify.org?format=json');
    return response.data.ip;
  } catch (error) {
    console.error('Error fetching client IP:', error);
    return '0.0.0.0'; // Fallback value
  }
};

/**
 * Get IP logs for a specific user
 */
export const getUserIpLogs = async (userId: string, limit = 50): Promise<IpLog[]> => {
  try {
    const { data, error } = await supabase
      .from('ip_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching IP logs:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching IP logs:', error);
    return [];
  }
};

/**
 * Get all IP logs with pagination
 */
export const getAllIpLogs = async (
  page = 0,
  limit = 20,
  searchTerm = ''
): Promise<{ data: IpLog[], count: number }> => {
  try {
    let query = supabase
      .from('ip_logs')
      .select('*', { count: 'exact' });
    
    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(
        `ip_address.ilike.%${searchTerm}%,user_id.eq.${searchTerm}`
      );
    }
    
    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    
    const { data, count, error } = await query;
    
    if (error) {
      console.error('Error fetching all IP logs:', error);
      return { data: [], count: 0 };
    }
    
    return { 
      data: data || [], 
      count: count || 0 
    };
  } catch (error) {
    console.error('Exception fetching all IP logs:', error);
    return { data: [], count: 0 };
  }
};

/**
 * Get IP usage statistics
 */
export const getIpStats = async (): Promise<{
  uniqueIps: number;
  totalLogs: number;
  recentIps: IpLog[];
}> => {
  try {
    // Get unique IP count
    const { count: uniqueIps, error: countError } = await supabase
      .from('ip_logs')
      .select('ip_address', { count: 'exact', head: true })
      .order('created_at', { ascending: false });
    
    if (countError) {
      console.error('Error fetching unique IP count:', countError);
    }
    
    // Get total logs count
    const { count: totalLogs, error: totalError } = await supabase
      .from('ip_logs')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      console.error('Error fetching total IP logs count:', totalError);
    }
    
    // Get most recent logs
    const { data: recentIps, error: recentError } = await supabase
      .from('ip_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error('Error fetching recent IP logs:', recentError);
    }
    
    return {
      uniqueIps: uniqueIps || 0,
      totalLogs: totalLogs || 0,
      recentIps: recentIps || []
    };
  } catch (error) {
    console.error('Exception fetching IP stats:', error);
    return {
      uniqueIps: 0,
      totalLogs: 0,
      recentIps: []
    };
  }
};

/**
 * Get users by IP address
 */
export const getUsersByIp = async (ipAddress: string): Promise<IpLog[]> => {
  try {
    const { data, error } = await supabase
      .from('ip_logs')
      .select('*')
      .eq('ip_address', ipAddress)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users by IP:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching users by IP:', error);
    return [];
  }
};

/**
 * Manually record an IP log
 */
export const recordIpLog = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> => {
  try {
    // If no IP address is provided, get it from the client
    const finalIpAddress = ipAddress || await getClientIp();
    
    // Get user agent from browser if not provided
    const finalUserAgent = userAgent || window.navigator.userAgent;
    
    const { data, error } = await supabase
      .from('ip_logs')
      .insert([
        {
          user_id: userId,
          ip_address: finalIpAddress,
          user_agent: finalUserAgent
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error recording IP log:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Exception recording IP log:', error);
    return null;
  }
};
