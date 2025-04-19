import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Book } from '../types/supabase';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import BookList from '../components/BookList';
import { FiArrowLeft, FiLoader } from 'react-icons/fi';
import { Link } from 'react-router-dom';

// Styled components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BackLink = styled(Link)`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  margin-right: ${({ theme }) => theme.spacing.md};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  color: ${({ theme }) => theme.colors.text};
`;

const MetadataCount = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.primary};
  
  svg {
    animation: spin 1s linear infinite;
    margin-right: ${({ theme }) => theme.spacing.sm};
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const NoResults = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// Types for metadata fields
export type MetadataType = 'publisher' | 'narrator' | 'year' | 'format' | 'genre' | 'language';

// Helper function to get metadata field label
const getFieldLabel = (type: string, t: any): string => {
  switch (type) {
    case 'publisher': 
      return t('books.publisher', 'Publisher');
    case 'narrator': 
      return t('books.narrator', 'Narrator');
    case 'year': 
      return t('books.year', 'Year');
    case 'format': 
      return t('books.fileFormats', 'Format');
    case 'genre': 
      return t('books.genre', 'Genre');
    case 'language': 
      return t('books.language', 'Language');
    default: 
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

// Helper function to sanitize metadata value
const sanitizeValue = (value: string): string => {
  return value.replace(/[\u200E\u200F\u2028\u2029\u200B]/g, '').trim();
};

// Helper function to build the appropriate database query
const buildQuery = (type: MetadataType, value: string, query: any) => {
  const sanitizedValue = sanitizeValue(value);
  
  switch (type) {
    case 'publisher':
      return query.ilike('publisher', `%${sanitizedValue}%`);
      
    case 'narrator':
      return query.ilike('narrator', `%${sanitizedValue}%`);
      
    case 'year':
      const year = parseInt(sanitizedValue, 10);
      if (!isNaN(year)) {
        return query
          .gte('published_date', `${year}-01-01`)
          .lte('published_date', `${year}-12-31`);
      }
      return query;
      
    case 'format':
      return query.or(`ebook_format.ilike.%${sanitizedValue}%,audio_format.ilike.%${sanitizedValue}%`);
      
    case 'genre':
      return query.or(`genre.ilike.%${sanitizedValue}%,categories.cs.{"${sanitizedValue}"}`);
      
    case 'language':
      return query.eq('language', sanitizedValue);
      
    default:
      return query;
  }
};

// Main component for metadata search
const MetadataSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const { field, value } = useParams<{ field?: string; value?: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;
  
  // Type guard for MetadataType
  const isValidMetadataType = (t: string | undefined): t is MetadataType => {
    return !!t && ['publisher', 'narrator', 'year', 'format', 'genre', 'language'].includes(t);
  };
  
  // Ensure we have valid parameters
  const validType = isValidMetadataType(field) ? field : 'publisher';
  const decodedValue = value ? decodeURIComponent(value.replace(/-/g, ' ')) : '';
  
  // Define fetchBooks outside of useEffect to avoid dependency issues
  const fetchBooks = async (currentPage = 1) => {
    if (!field || !value) {
      setError('Missing metadata field or value');
      setLoading(false);
      return;
    }
    
    try {
      console.log(`Fetching books for ${field}: "${decodedValue}" (page ${currentPage})`);
      setLoading(true);
      
      // Start query
      let query = supabase
        .from('books')
        .select('*');
      
      // Apply filter based on metadata type
      query = buildQuery(validType, decodedValue, query);
      
      // Apply pagination
      query = query
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
        .order('created_at', { ascending: false });
      
      const { data, error: queryError } = await query;
      
      if (queryError) {
        console.error('Error fetching books:', queryError);
        setError(`Error fetching books: ${queryError.message}`);
      } else if (data) {
        console.log(`Found ${data.length} books for ${field}: "${decodedValue}"`);
        
        // Append books for pagination
        if (currentPage > 1) {
          setBooks(prev => [...prev, ...data]);
        } else {
          setBooks(data);
        }
        
        // Check if we have more books to load
        setHasMore(data.length === pageSize);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Failed to fetch books:', errorMessage);
      setError(`Failed to fetch books: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch on mount and when parameters change
  useEffect(() => {
    // Reset state
    setBooks([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    setError(null);
    
    // Immediately fetch books
    console.log('MetadataSearchPage: Immediately fetching books for', field, decodedValue);
    fetchBooks(1);
  }, [field, value]); // fetchBooks is defined outside, so it's not a dependency
  
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBooks(nextPage);
  };
  
  // Format display value based on type
  let displayValue = decodedValue;
  if (isValidMetadataType(field)) {
    if (field === 'format') {
      displayValue = displayValue.toUpperCase();
    } else if (field === 'year' || field === 'language') {
      // These are fine as is
    } else {
      // Capitalize first letter of each word for other types
      // Using a custom capitalizeWord function to avoid TypeScript errors
      const capitalizeWord = (word: string): string => {
        if (word.length === 0) return word;
        return word[0].toUpperCase() + word.substring(1);
      };
      
      // Apply capitalization to each word
      displayValue = displayValue
        .split(' ')
        .map(word => capitalizeWord(word))
        .join(' ');
    }
  }
  
  return (
    <PageContainer>
      <Header>
        <Breadcrumb>
          <BackLink to="/">
            <FiArrowLeft style={{ marginRight: '8px' }} />
            {t('common.backToHome', 'Back to Home')}
          </BackLink>
          {" > "}
          <span>{getFieldLabel(validType, t)}</span>
        </Breadcrumb>
        
        <PageTitle>
          {getFieldLabel(validType, t)}: {displayValue}
        </PageTitle>
        
        <MetadataCount>
          {books.length} {books.length === 1 
            ? t('common.book', 'book') 
            : t('common.books', 'books')}
        </MetadataCount>
      </Header>
      
      {loading && books.length === 0 ? (
        <LoadingIndicator>
          <FiLoader size={24} />
          {t('common.loading', 'Loading...')}
        </LoadingIndicator>
      ) : error ? (
        <NoResults style={{ color: '#e53935' }}>
          <div style={{ marginBottom: '10px' }}>
            {t('common.error', 'Error')}: {error}
          </div>
          <BackLink to="/">
            {t('common.backToHome', 'Back to Home')}
          </BackLink>
        </NoResults>
      ) : books.length > 0 ? (
        <BookList 
          books={books} 
          loading={loading} 
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
      ) : (
        <NoResults>
          {t('common.noBooks', 'No books found matching your criteria.')}
        </NoResults>
      )}
    </PageContainer>
  );
};

export default MetadataSearchPage;
