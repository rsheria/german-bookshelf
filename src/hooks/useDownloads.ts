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
    if (!user || !profile) return 0;
    try {
      // Use RPC to count unique daily downloads per user
      const { data: uniqueCountRes, error: rpcError } = await supabase
        .rpc('count_unique_daily_downloads', { uid: user.id });
      if (rpcError) throw rpcError;
      let used = 0;
      if (typeof uniqueCountRes === 'number') {
        used = uniqueCountRes;
      } else if (Array.isArray(uniqueCountRes) && uniqueCountRes.length > 0) {
        const row = uniqueCountRes[0] as Record<string, any>;
        used = Number(Object.values(row)[0]) || 0;
      }
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

      // Log the download; ignore duplicates so quota isn't decremented
      const { error: logError } = await supabase
        .from('download_logs')
        .insert({ user_id: user.id, book_id: bookId });
      const isNew = !logError;
      if (logError) {
        // If not a unique constraint violation, rethrow
        if (!/unique/i.test(logError.message)) {
          throw logError;
        }
      }
      // Proceed with download
      window.open(downloadUrl, '_blank');
      // Decrement quota only on first download per book
      if (isNew) {
        setRemainingQuota(prev => prev !== null ? prev - 1 : null);
      }
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
