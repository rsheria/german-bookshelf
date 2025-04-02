import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface UseDownloadsResult {
  downloadBook: (bookId: string, downloadUrl: string) => Promise<boolean>;
  isLoading: boolean;
  error: Error | null;
  remainingQuota: number | null;
  checkRemainingQuota: () => Promise<number>;
}

export const useDownloads = (): UseDownloadsResult => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);

  const checkRemainingQuota = async (): Promise<number> => {
    if (!user || !profile) {
      return 0;
    }

    try {
      // Get today's date at midnight for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISOString = today.toISOString();

      // Count downloads made today
      const { count, error } = await supabase
        .from('download_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('downloaded_at', todayISOString);

      if (error) {
        throw error;
      }

      const used = count || 0;
      const remaining = Math.max(0, profile.daily_quota - used);
      
      setRemainingQuota(remaining);
      return remaining;
    } catch (err) {
      console.error('Error checking quota:', err);
      setError(err as Error);
      return 0;
    }
  };

  const downloadBook = async (bookId: string, downloadUrl: string): Promise<boolean> => {
    if (!user || !profile) {
      setError(new Error('You must be logged in to download books'));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check remaining quota
      const remaining = await checkRemainingQuota();
      
      if (remaining <= 0) {
        throw new Error('You have reached your daily download limit');
      }

      // Log the download
      const { error: logError } = await supabase
        .from('download_logs')
        .insert({
          user_id: user.id,
          book_id: bookId
        });

      if (logError) {
        throw logError;
      }

      // Open the download URL in a new tab
      window.open(downloadUrl, '_blank');
      
      // Update remaining quota
      setRemainingQuota(prev => prev !== null ? prev - 1 : null);
      
      return true;
    } catch (err) {
      setError(err as Error);
      console.error('Error downloading book:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    downloadBook,
    isLoading,
    error,
    remainingQuota,
    checkRemainingQuota
  };
};
