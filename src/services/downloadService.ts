import { supabase } from './supabase';
import { UserDownloadStats } from '../types/supabase';

// Interface for user download log with nested book info
export interface DownloadLog {
  id: string;
  downloaded_at: string;
  book?: {
    id: string;
    title: string;
    author: string;
  };
}

/**
 * Get download logs for a specific user
 */
export const getUserDownloads = async (userId: string, limit = 50): Promise<DownloadLog[]> => {
  try {
    const { data, error } = await supabase
      .from('download_logs')
      // nest the related book record under 'book' key
      .select('id, downloaded_at, book:books(id, title, author)')
      .eq('user_id', userId)
      .order('downloaded_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) {
      console.error('Error fetching user downloads:', error);
      return [];
    }
    // Map nested book array to single object
    const downloadLogs: DownloadLog[] = (data as any[]).map(d => ({
      id: d.id,
      downloaded_at: d.downloaded_at,
      book: Array.isArray(d.book) && d.book.length > 0 ? d.book[0] : undefined
    }));
    return downloadLogs;
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
): Promise<{ data: any[], count: number }> => {
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
    
    // Get top downloaded books from view
    const { data: topBooksView, error: topViewError } = await supabase
      .from('books_with_download_count')
      .select('id, title, download_count')
      .order('download_count', { ascending: false })
      .limit(10);
    
    if (topViewError) {
      console.error('Error fetching top downloaded books:', topViewError);
    }
    
    // Map view data to expected format
    const topBooks = (topBooksView || []).map(book => ({
      book_id: book.id,
      title: book.title,
      count: book.download_count
    }));
    
    return {
      totalDownloads: totalDownloads || 0,
      downloadsToday: downloadsToday || 0,
      downloadsThisWeek: downloadsThisWeek || 0,
      downloadsThisMonth: downloadsThisMonth || 0,
      topBooks
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
