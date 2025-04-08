import { supabase } from './supabase';
import { DownloadLog, UserDownloadStats } from '../types/supabase';

/**
 * Get download logs for a specific user
 */
export const getUserDownloads = async (userId: string, limit = 50): Promise<DownloadLog[]> => {
  try {
    const { data, error } = await supabase
      .from('download_logs')
      .select('*, books(*)')
      .eq('user_id', userId)
      .order('downloaded_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching user downloads:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching user downloads:', error);
    return [];
  }
};

/**
 * Get all download logs with pagination
 */
export const getAllDownloads = async (
  page = 0, 
  limit = 20,
  searchTerm = ''
): Promise<{ data: DownloadLog[], count: number }> => {
  try {
    let query = supabase
      .from('download_logs')
      .select('*, books(*), profiles(username)', { count: 'exact' });
    
    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(
        `user_id.eq.${searchTerm},books.title.ilike.%${searchTerm}%,books.author.ilike.%${searchTerm}%`
      );
    }
    
    // Apply pagination
    query = query
      .order('downloaded_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    
    const { data, count, error } = await query;
    
    if (error) {
      console.error('Error fetching all downloads:', error);
      return { data: [], count: 0 };
    }
    
    return { 
      data: data || [], 
      count: count || 0 
    };
  } catch (error) {
    console.error('Exception fetching all downloads:', error);
    return { data: [], count: 0 };
  }
};

/**
 * Get download statistics
 */
export const getDownloadStats = async (): Promise<{
  totalDownloads: number;
  downloadsToday: number;
  downloadsThisWeek: number;
  downloadsThisMonth: number;
  topBooks: { book_id: string; title: string; count: number }[];
}> => {
  try {
    // Get total download count
    const { count: totalDownloads, error: totalError } = await supabase
      .from('download_logs')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      console.error('Error fetching total downloads:', totalError);
    }
    
    // Get today's download count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: downloadsToday, error: todayError } = await supabase
      .from('download_logs')
      .select('*', { count: 'exact', head: true })
      .gte('downloaded_at', today.toISOString());
    
    if (todayError) {
      console.error('Error fetching today downloads:', todayError);
    }
    
    // Get this week's download count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: downloadsThisWeek, error: weekError } = await supabase
      .from('download_logs')
      .select('*', { count: 'exact', head: true })
      .gte('downloaded_at', weekAgo.toISOString());
    
    if (weekError) {
      console.error('Error fetching week downloads:', weekError);
    }
    
    // Get this month's download count
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const { count: downloadsThisMonth, error: monthError } = await supabase
      .from('download_logs')
      .select('*', { count: 'exact', head: true })
      .gte('downloaded_at', monthAgo.toISOString());
    
    if (monthError) {
      console.error('Error fetching month downloads:', monthError);
    }
    
    // Get top downloaded books
    const { data: topBooks, error: topError } = await supabase
      .rpc('get_top_downloaded_books', { limit_count: 10 });
    
    if (topError) {
      console.error('Error fetching top downloaded books:', topError);
    }
    
    return {
      totalDownloads: totalDownloads || 0,
      downloadsToday: downloadsToday || 0,
      downloadsThisWeek: downloadsThisWeek || 0,
      downloadsThisMonth: downloadsThisMonth || 0,
      topBooks: topBooks || []
    };
  } catch (error) {
    console.error('Exception fetching download stats:', error);
    return {
      totalDownloads: 0,
      downloadsToday: 0,
      downloadsThisWeek: 0,
      downloadsThisMonth: 0,
      topBooks: []
    };
  }
};

/**
 * Get user download statistics
 */
export const getUserDownloadStats = async (userId?: string): Promise<UserDownloadStats[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_download_stats', { lookup_user_id: userId });
    
    if (error) {
      console.error('Error fetching user download stats:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching user download stats:', error);
    return [];
  }
};
