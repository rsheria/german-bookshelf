import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useLocation, useSearchParams, useParams } from 'react-router-dom';

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { filters, updateFilter, resetFilters } = useBookFilter();
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const initialMetadataLoad = useRef(true);

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const params = useParams<{ field?: string; value?: string }>();
  

  


  // Keep UI categories in sync with ?category=
  useEffect(() => {
    const catParam = searchParams.get('category');
    setSelectedCategories(catParam ? catParam.split(',') : []);
  }, [location.search]);

  // Handle metadata path parameters and search queries
  useEffect(() => {
    // Reset pagination whenever parameters change
    setBooks([]);
    setPage(1);
    setHasMore(true);
    
    // Check for metadata path parameters
    if (params.field && params.value) {
      const decodedValue = decodeURIComponent(params.value.replace(/-/g, ' '));
      const formattedQuery = `${params.field}:"${decodedValue}"`;
      
      console.log('Detected metadata path parameters:', params.field, decodedValue);
      console.log('Setting search query to:', formattedQuery);
      
      // No need to store original metadata anymore, handled by FilterPanel
      
      // Set the query filter directly
      updateFilter('query', formattedQuery);
      
      // Execute search immediately with a delay to ensure state is updated
      setTimeout(() => {
        console.log('Executing direct search for metadata parameters with query:', formattedQuery);
        // Execute the search directly
        executeMetadataSearch(params.field as string, decodedValue);
      }, 100);
    }
    // Handle regular search query parameter
    else if (searchParams.get('query')) {
      const queryParam = searchParams.get('query')!;
      console.log('Setting search query from URL parameter:', queryParam);
      updateFilter('query', queryParam);
    } else {
      console.log('No metadata/query param detected: resetting filters');
      resetFilters();
    }
  }, [params.field, params.value, searchParams.get('query')]);

  // Handle filter and pagination changes
  useEffect(() => {
    // Skip the first metadata-triggered fetch to avoid duplication
    if (params.field && params.value && initialMetadataLoad.current) {
      initialMetadataLoad.current = false;
      return;
    }
    
    // For filter changes, we need to use the appropriate search function
    console.log('Filter or pagination changed, updating results with:', JSON.stringify(filters));
    
    // For metadata searches, call the metadata search function with the current field and value
    if (params.field && params.value) {
      const decodedValue = decodeURIComponent(params.value.replace(/-/g, ' '));
      console.log('Using executeMetadataSearch for filter changes with metadata parameters');
      executeMetadataSearch(params.field as string, decodedValue);
    } else {
      // For regular searches, use the fetchBooks function
      fetchBooks();
    }
  }, [filters, selectedCategories, page]);

  // Function to directly execute a metadata search
  const executeMetadataSearch = async (field: string, value: string) => {
    console.log(`Executing metadata search for ${field}:"${value}"`);
    setLoading(true);
    setBooks([]);
    
    try {
      let query = supabase.from('books').select('*');
      
      // Apply the metadata filter based on the field
      const sanitizedValue = value.replace(/[\u200E\u200F\u2028\u2029\u200B]/g, '').trim();
      
      // Apply the primary filter based on the field
      console.log(`Original metadata search: ${field}:"${sanitizedValue}"`);
      
      // Apply the primary metadata filter based on field type
      switch (field.toLowerCase()) {
        case 'publisher':
          query = query.ilike('publisher', `%${sanitizedValue}%`);
          break;
        case 'narrator':
          query = query.ilike('narrator', `%${sanitizedValue}%`);
          break;
        case 'year':
          const year = parseInt(sanitizedValue, 10);
          if (!isNaN(year)) {
            query = query
              .gte('published_date', `${year}-01-01`)
              .lte('published_date', `${year}-12-31`);
          }
          break;
        case 'language':
          query = query.eq('language', sanitizedValue);
          break;
        case 'format':
          query = query.or(`ebook_format.ilike.%${sanitizedValue}%,audio_format.ilike.%${sanitizedValue}%`);
          break;
        case 'genre':
        case 'category':
          query = query.or(`genre.ilike.%${sanitizedValue}%,categories.cs.{"${sanitizedValue}"}`);
          break;
        case 'author':
          query = query.ilike('author', `%${sanitizedValue}%`);
          break;
        case 'fictiontype':
          query = query.eq('fictionType', sanitizedValue);
          break;
        case 'isbn':
          query = query.eq('isbn', sanitizedValue);
          break;
        case 'external_id':
          query = query.eq('external_id', sanitizedValue);
          break;
        default:
          // Default to a general search if field is not recognized
          query = query.or(
            `title.ilike.%${sanitizedValue}%,author.ilike.%${sanitizedValue}%,publisher.ilike.%${sanitizedValue}%,description.ilike.%${sanitizedValue}%,isbn.ilike.%${sanitizedValue}%,external_id.ilike.%${sanitizedValue}%,narrator.ilike.%${sanitizedValue}%`
          );
      }
      
      // Apply additional filters from the filter panel
      
      // Year range filters
      if (filters.yearFrom) {
        console.log('Applying yearFrom filter:', filters.yearFrom);
        query = query.gte('published_year', filters.yearFrom);
      }
      
      if (filters.yearTo) {
        console.log('Applying yearTo filter:', filters.yearTo);
        query = query.lte('published_year', filters.yearTo);
      }
      
      // Language filter - always apply if set
      if (filters.language) {
        console.log('Applying language filter:', filters.language);
        query = query.eq('language', filters.language);
      }
      
      // File type filter - always apply if set
      if (filters.fileType) {
        console.log('Applying fileType filter:', filters.fileType);
        query = query.or(`ebook_format.ilike.%${filters.fileType}%,audio_format.ilike.%${filters.fileType}%`);
      }
      
      // Book type filter
      if (filters.bookType !== 'all') {
        console.log('Applying bookType filter:', filters.bookType);
        query = query.eq('type', filters.bookType);
      }
      
      // Fiction type filter - always apply if set
      if (filters.fictionType && filters.fictionType !== 'all') {
        console.log('Applying fictionType filter:', filters.fictionType);
        query = query.eq('fictionType', filters.fictionType);
      }
      
      // Categories filter - always apply if set
      if (selectedCategories.length > 0) {
        console.log('Applying categories filter:', selectedCategories);
        const ors = selectedCategories.map(cat => `categories.cs.{${cat.trim()}}`).join(',');
        query = query.or(ors);
      }
      
      // Apply sorting based on selected sort option
      switch (filters.sortBy) {
        case 'popularity':
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
          query = query.order('published_year', { ascending: false });
          break;
        case 'size_asc':
          query = query.order('file_size_bytes', { ascending: true });
          break;
        case 'size_desc':
          query = query.order('file_size_bytes', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }
      
      // Apply pagination
      const pageSize = 20;
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
      
      console.log(`Executing direct query for ${field}: "${sanitizedValue}" with additional filters`);
      
      // Log the full query details for debugging
      console.log('Query details:', {
        metadata: { field, value: sanitizedValue },
        filters: filters,
        categories: selectedCategories,
        page: page
      });
      
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching books:', error);
        // Show error in UI
        setBooks([]);
        setHasMore(false);
      } else {
        // Handle both cases - with and without results - in the same way
        const resultCount = data ? data.length : 0;
        console.log(`Found ${resultCount} books for ${field}: "${sanitizedValue}" with filters`);
        
        // Always update the books state, even if it's empty
        // This ensures the component re-renders with new filter values
        setBooks(data || []);
        setHasMore(data && data.length === pageSize);
      }
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBooks = async () => {
    if (loading) return;
    console.log('Executing fetchBooks with filters:', JSON.stringify(filters));
    setLoading(true);

    try {
      let query = supabase.from('books').select('*');

      // apply text/field filters
      if (filters.query) {
        const specialQueryMatch = filters.query.match(/^(\w+):"?([^"]+)"?$/);
        if (specialQueryMatch) {
          const [_, field, value] = specialQueryMatch;
          const sanitizedValue = value.replace(/[ -]/g, '').trim();

          switch (field.toLowerCase()) {
            case 'publisher':
              query = query.ilike('publisher', `%${sanitizedValue}%`);
              break;
            case 'narrator':
              query = query.ilike('narrator', `%${sanitizedValue}%`);
              break;
            case 'year':
              const year = parseInt(sanitizedValue, 10);
              if (!isNaN(year)) {
                query = query
                  .gte('published_date', `${year}-01-01`)
                  .lte('published_date', `${year}-12-31`);
              }
              break;
            case 'language':
              query = query.eq('language', sanitizedValue);
              break;
            case 'format':
              query = query.or(`ebook_format.ilike.%${sanitizedValue}%,audio_format.ilike.%${sanitizedValue}%`);
              break;
            case 'genre':
            case 'category':
              query = query.or(`genre.ilike.%${sanitizedValue}%,categories.cs.{"${sanitizedValue}"}`);
              break;
            case 'author':
              query = query.ilike('author', `%${sanitizedValue}%`);
              break;
            case 'fictiontype':
              query = query.eq('fictionType', sanitizedValue);
              break;
            case 'isbn':
              query = query.eq('isbn', sanitizedValue);
              break;
            case 'external_id':
              query = query.eq('external_id', sanitizedValue);
              break;
            default:
              if (filters.exactMatch) {
                query = query.or(
                  `title.eq.${filters.query},author.eq.${filters.query},publisher.eq.${filters.query},isbn.eq.${filters.query},external_id.eq.${filters.query},narrator.eq.${filters.query}`
                );
              } else {
                query = query.or(
                  `title.ilike.%${filters.query}%,author.ilike.%${filters.query}%,publisher.ilike.%${filters.query}%,description.ilike.%${filters.query}%,isbn.ilike.%${filters.query}%,external_id.ilike.%${filters.query}%,narrator.ilike.%${filters.query}%`
                );
              }
          }
        } else {
          if (filters.exactMatch) {
            query = query.or(
              `title.eq.${filters.query},author.eq.${filters.query},publisher.eq.${filters.query},isbn.eq.${filters.query},external_id.eq.${filters.query},narrator.eq.${filters.query}`
            );
          } else {
            query = query.or(
              `title.ilike.%${filters.query}%,author.ilike.%${filters.query}%,publisher.ilike.%${filters.query}%,description.ilike.%${filters.query}%,isbn.ilike.%${filters.query}%,external_id.ilike.%${filters.query}%,narrator.ilike.%${filters.query}%`
            );
          }
        }
      }

      // year range
      if (filters.yearFrom) query = query.gte('published_year', filters.yearFrom);
      if (filters.yearTo)   query = query.lte('published_year', filters.yearTo);

      // language
      if (filters.language) query = query.eq('language', filters.language);

      // file type
      if (filters.fileType) {
        query = query.or(`ebook_format.ilike.%${filters.fileType}%,audio_format.ilike.%${filters.fileType}%`);
      }

      // book type
      if (filters.bookType !== 'all') {
        query = query.eq('type', filters.bookType);
      }

      // fiction type
      if (filters.fictionType && filters.fictionType !== 'all') {
        query = query.eq('fictionType', filters.fictionType);
      }

      // categories
      if (selectedCategories.length > 0) {
        const ors = selectedCategories.map(cat => `categories.cs.{${cat.trim()}}`).join(',');
        query = query.or(ors);
      }

      // Always proceed with the query, even if it's empty
      // This allows filters to work properly even when the query is reset
      
      // sorting
      switch (filters.sortBy) {
        case 'popularity':
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
          query = query.order('published_year', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // pagination
      const pageSize = 20;
      query = query.range((page - 1) * pageSize, page * pageSize - 1);

      console.log('Executing advanced search with filters:', {
        query: filters.query,
        bookType: filters.bookType,
        fictionType: filters.fictionType,
        categories: selectedCategories
      });

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching books:', error);
      } else {
        // Handle both cases - with and without results - in the same way
        const resultCount = data ? data.length : 0;
        console.log(`Found ${resultCount} books with current filters`);
        
        // Set the books state appropriately
        if (data) {
          if (page > 1 && data.length > 0) {
            setBooks(prev => [...prev, ...data]);
          } else {
            // Always set the books directly on first page or empty results
            // This ensures component re-renders with new filter values
            setBooks(data);
          }
          setHasMore(data.length === pageSize);
        } else {
          setBooks([]);
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => setPage(prev => prev + 1);

  return (
    <PageContainer>
      <SearchHeader>
        <SearchBar />
        <FilterPanel />
      </SearchHeader>

      <ContentContainer>
        <CategorySidebar
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
        />

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

// Wrapper to provide the filter context
const SearchResultsPage: React.FC = () => (
  <BookFilterProvider>
    <SearchResultsContent />
  </BookFilterProvider>
);

export default SearchResultsPage;
