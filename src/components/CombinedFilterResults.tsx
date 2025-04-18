import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '../styles/adminStyles';
import BookGrid from './BookGrid';
import theme from '../styles/theme';

interface CombinedFilterResultsProps {
  bookType: string | null;
  fictionType: string | null;
  searchTerm: string;
}

const CombinedFilterResults: React.FC<CombinedFilterResultsProps> = ({
  bookType,
  fictionType,
  searchTerm
}) => {
  const { t } = useTranslation();
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      setIsLoading(true);
      
      try {
        console.log(`Fetching books with type: ${bookType}, fiction: ${fictionType}, search: ${searchTerm}`);
        
        // Start building the query
        let query = supabase.from('books').select('*');
        
        // Always apply both filters
        if (bookType && bookType !== 'all') {
          query = query.eq('type', bookType);
        }
        
        if (fictionType && fictionType !== 'all') {
          query = query.eq('fictionType', fictionType);
        }
        
        // Add search term if provided
        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        console.log(`Found ${data?.length || 0} books with combined filters`);
        console.log('Sample data:', data?.slice(0, 2));
        
        setBooks(data || []);
      } catch (err) {
        console.error('Error fetching filtered books:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch books'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBooks();
  }, [bookType, fictionType, searchTerm]);
  
  return (
    <>
      <div style={{ marginBottom: theme.spacing.md }}>
        <h2>{bookType === 'ebook' ? 'E-Books' : 'Audiobooks'} - {fictionType}</h2>
        <div style={{ 
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.backgroundAlt,
          borderRadius: theme.borderRadius.sm,
          marginBottom: theme.spacing.md
        }}>
          <strong>Active Filters:</strong> {bookType} + {fictionType}
          {searchTerm && <span> + Search: "{searchTerm}"</span>}
        </div>
      </div>
      
      {isLoading ? (
        <LoadingState>{t('common.loading')}</LoadingState>
      ) : error ? (
        <div style={{ 
          padding: theme.spacing.xl, 
          textAlign: 'center', 
          color: theme.colors.error 
        }}>
          {error.message}
        </div>
      ) : (
        <BookGrid books={books} isLoading={false} error={null} />
      )}
    </>
  );
};

export default CombinedFilterResults;
