import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useLocation, useSearchParams } from 'react-router-dom';
// We'll uncomment this when adding more UI text
// import { useTranslation } from 'react-i18next';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import BookList from '../components/BookList';
import { CategorySidebar } from '../components/CategorySidebar';
import { BookFilterProvider, useBookFilter } from '../context/BookFilterContext';
import { supabase } from '../services/supabase';
import { Book } from '../types/supabase';
import theme from '../styles/theme';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg} ${theme.spacing.md};
`;

const SearchHeader = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const ContentContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  
  @media (max-width: 992px) {
    flex-direction: column;
  }
`;

const MainContent = styled.div`
  flex: 1;
`;

const SearchResultsContent: React.FC = () => {
  // const { t } = useTranslation(); // Will use this later with more UI text
  const { filters } = useBookFilter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Initialize filters from URL parameters if present
    const queryParam = searchParams.get('query');
    if (queryParam) {
      // This would be handled by the BookFilterContext
    }
    
    // Reset when filters change
    setBooks([]);
    setPage(1);
    setHasMore(true);
    fetchBooks();
  }, [filters, location.search]);
  
  const fetchBooks = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      // Build the query based on filters
      let query = supabase
        .from('books')
        .select('*');
      
      // Apply filters
      if (filters.query) {
        // For simplicity, search in title and author
        // In a real implementation, you would use full-text search or a more sophisticated approach
        if (filters.exactMatch) {
          query = query
            .or(`title.eq.${filters.query},author.eq.${filters.query}`);
        } else {
          query = query
            .or(`title.ilike.%${filters.query}%,author.ilike.%${filters.query}%`);
        }
      }
      
      if (filters.yearFrom) {
        // Assuming you have a published_year field
        query = query.gte('published_date', filters.yearFrom.toString());
      }
      
      if (filters.yearTo) {
        query = query.lte('published_date', filters.yearTo.toString());
      }
      
      if (filters.language) {
        query = query.eq('language', filters.language);
      }
      
      if (filters.bookType !== 'all') {
        query = query.eq('type', filters.bookType);
      }
      
      // Apply sorting
      switch (filters.sortBy) {
        case 'popularity':
          // This would require a popularity field or download count
          query = query.order('created_at', { ascending: false });
          break;
        case 'latest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('title', { ascending: false });
          break;
        case 'year':
          query = query.order('published_date', { ascending: false });
          break;
        // Size ordering would require a file_size field
        default:
          query = query.order('created_at', { ascending: false });
      }
      
      // Pagination
      const pageSize = 20;
      query = query
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching books:', error);
      } else if (data) {
        // Append books for pagination
        if (page > 1) {
          setBooks(prev => [...prev, ...data]);
        } else {
          setBooks(data);
        }
        
        // Check if we have more books to load
        setHasMore(data.length === pageSize);
      }
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };
  
  return (
    <PageContainer>
      <SearchHeader>
        <SearchBar onToggleFilters={() => setShowFilters(!showFilters)} />
        {showFilters && <FilterPanel />}
      </SearchHeader>
      
      <ContentContainer>
        <CategorySidebar />
        
        <MainContent>
          <BookList 
            books={books} 
            loading={loading} 
            hasMore={hasMore} 
            onLoadMore={handleLoadMore} 
          />
        </MainContent>
      </ContentContainer>
    </PageContainer>
  );
};

// Wrapper component to provide the filter context
const SearchResultsPage: React.FC = () => {
  return (
    <BookFilterProvider>
      <SearchResultsContent />
    </BookFilterProvider>
  );
};

export default SearchResultsPage;
