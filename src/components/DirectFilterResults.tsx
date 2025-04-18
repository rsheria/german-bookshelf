import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '../styles/adminStyles';
import BookGrid from './BookGrid';
import theme from '../styles/theme';
import styled from 'styled-components';

// For debugging the database structure
const TABLE_NAME = 'books';

const DebugBox = styled.div`
  padding: 15px;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  margin-bottom: 20px;
`;

interface DirectFilterResultsProps {
  bookType: string | null;
  fictionType: string | null;
  searchTerm: string;
}

const DirectFilterResults: React.FC<DirectFilterResultsProps> = ({
  bookType,
  fictionType,
  searchTerm
}) => {
  const { t } = useTranslation();
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // First, let's examine the database structure to find the correct column names
  useEffect(() => {
    const inspectDatabaseStructure = async () => {
      try {
        // First, get a sample of data to inspect structure
        const { data: sampleData } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .limit(1);
          
        if (sampleData && sampleData.length > 0) {
          console.log('DATABASE INSPECTION - Sample book:', sampleData[0]);
          const sampleBook = sampleData[0];
          
          // Check what fiction type column is called
          let possibleFictionTypeColumns = ['fictionType', 'fiction_type', 'fiction', 'booktype', 'book_type', 'category'];
          let foundFictionColumn = null;
          
          for (const column of possibleFictionTypeColumns) {
            if (column in sampleBook) {
              foundFictionColumn = column;
              console.log(`FOUND Fiction type column: ${column} with value: ${sampleBook[column]}`);
              break;
            }
          }
          
          if (!foundFictionColumn) {
            console.log('WARNING: Could not find fiction type column in database');
          }
        }
      } catch (err) {
        console.error('Error inspecting database:', err);
      }
    };
    
    inspectDatabaseStructure();
  }, []);

  useEffect(() => {
    const fetchDirectlyFromDatabase = async () => {
      setIsLoading(true);
      
      try {
        console.log(`DIRECT FILTER - Fetching with type: ${bookType}, fiction: ${fictionType}`);
        
        // Let's be extremely verbose with logging to debug the issue
        console.log('DEBUGGING SEARCH FILTERS:');
        console.log(`Book Type: ${bookType || 'All'}`);
        console.log(`Fiction Type: ${fictionType || 'All'}`);
        console.log(`Search Term: ${searchTerm || 'None'}`);
        
        // First fetch all books to inspect what we have in the database
        const { data: allBooks } = await supabase
          .from(TABLE_NAME)
          .select('*');
          
        console.log(`Total books in database: ${allBooks?.length || 0}`);
        if (allBooks && allBooks.length > 0) {
          console.log('Database sample:', allBooks[0]);
          
          // Count book types
          const bookTypeCounts: Record<string, number> = {};
          const fictionTypeCounts: Record<string, number> = {};
          
          allBooks.forEach(book => {
            // Count book types
            const bookType = book.type || 'unknown';
            bookTypeCounts[bookType] = (bookTypeCounts[bookType] || 0) + 1;
            
            // Count fiction types
            const fictionType = book.fictionType || 'undefined';
            fictionTypeCounts[fictionType] = (fictionTypeCounts[fictionType] || 0) + 1;
          });
          
          console.log('Book type counts:', bookTypeCounts);
          console.log('Fiction type counts:', fictionTypeCounts);
        }
        
        // Build the query - starting fresh
        let query = supabase.from(TABLE_NAME).select('*');
        let filterDescription = [];
        
        // Apply book type filter
        if (bookType) {
          query = query.eq('type', bookType);
          console.log(`Applied book type filter: ${bookType}`);
          filterDescription.push(`type=${bookType}`);
        }
        
        // Apply fiction type filter ONLY when a specific type is selected
        // When 'all' is selected or no fiction type is specified, we show all books
        if (fictionType && fictionType !== 'all') {
          query = query.eq('fictionType', fictionType);
          console.log(`Applied fiction type filter: ${fictionType}`);
          filterDescription.push(`fictionType=${fictionType}`);
        } else {
          console.log('No fiction type filter applied - showing all fiction types');
        }
        
        // Apply search term filter if provided
        if (searchTerm && searchTerm.trim() !== '') {
          query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`);
          console.log(`Applied search term filter: ${searchTerm}`);
          filterDescription.push(`search="${searchTerm}"`);
        }
        
        console.log('Query filters:', filterDescription.join(', '));
        
        // Execute the query
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Show results in console for debugging
        console.log(`DIRECT FILTER - Found ${data?.length || 0} books with filters`);
        console.log('First few books:', data?.slice(0, 3));
        
        // Update state
        setBooks(data || []);
        
        // Store debug info
        setDebugInfo({
          filters: {
            bookType: bookType || 'all',
            fictionType: fictionType || 'all',
            searchTerm: searchTerm || 'none'
          },
          results: {
            total: data?.length || 0,
            sample: data?.slice(0, 3).map(book => ({
              id: book.id,
              title: book.title,
              type: book.type,
              fictionType: book.fictionType
            }))
          },
          query: `type=${bookType || 'all'}, fictionType=${fictionType || 'none'}`
        });
      } catch (err) {
        console.error('Error in DirectFilterResults:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch books'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDirectlyFromDatabase();
  }, [bookType, fictionType, searchTerm]);
  
  return (
    <div>
      <h2>
        {bookType === 'ebook' ? 'E-Books' : bookType === 'audiobook' ? 'Audiobooks' : 'All Books'}
        {fictionType && ` - ${fictionType}`}
      </h2>
      
      {/* Display a warning to explain why no results when selecting Fiction */}
      {fictionType === 'Fiction' && books.length === 0 && (
        <div style={{ 
          padding: '10px 15px', 
          backgroundColor: '#fffbe6', 
          border: '1px solid #ffe58f',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <strong>No books found:</strong> There are no books in the database with Fiction type.
          Visit the <a href="/database-debug" style={{ color: '#1890ff' }}>Database Debug</a> page to set some books as Fiction.
        </div>
      )}
      
      {/* Debug information - this is helpful for troubleshooting */}
      <DebugBox>
        <h3 style={{ margin: '0 0 10px 0' }}>Filter Debug Information</h3>
        <p><strong>Applied Filters:</strong></p>
        <ul>
          <li>Book Type: {bookType || 'All'}</li>
          <li>Fiction Type: {fictionType || 'All'}</li>
          <li>Search Term: {searchTerm || 'None'}</li>
        </ul>
        <p><strong>Results:</strong> Found {books.length} books</p>
        {debugInfo && debugInfo.results.sample.length > 0 && (
          <>
            <p><strong>Sample Books:</strong></p>
            <ul>
              {debugInfo.results.sample.map((book: any) => (
                <li key={book.id}>
                  {book.title} - Type: {book.type}, Fiction Type: {book.fictionType || 'Not set'}
                </li>
              ))}
            </ul>
          </>
        )}
      </DebugBox>
      
      {/* Results */}
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
      ) : books.length === 0 ? (
        <div style={{ 
          padding: theme.spacing.xl, 
          textAlign: 'center', 
          color: theme.colors.textSecondary,
          backgroundColor: theme.colors.backgroundAlt,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.shadows.sm
        }}>
          No books found matching your filters.
        </div>
      ) : (
        <BookGrid books={books} isLoading={false} error={null} />
      )}
    </div>
  );
};

export default DirectFilterResults;
