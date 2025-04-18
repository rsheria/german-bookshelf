import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiSearch, FiFilter } from 'react-icons/fi';
import { BookType } from '../types/supabase';
import { supabase } from '../services/supabase';
import BookGrid from '../components/BookGrid';
import { CategorySidebar } from '../components/CategorySidebar';
import { useBookFilters } from '../hooks/useBookFilters';
import { LoadingState } from '../styles/adminStyles';
import theme from '../styles/theme';
import DirectFilterResults from '../components/DirectFilterResults';

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing.md};
  
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const MainContent = styled.div`
  flex: 1;
  margin-top: ${theme.spacing.md};
  
  @media (min-width: 768px) {
    margin-top: 0;
    margin-left: ${theme.spacing.md};
  }
`;

const SearchContainer = styled.form`
  display: flex;
  margin-bottom: ${theme.spacing.md};
  position: relative;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  font-size: 1rem;
  outline: none;
  
  &:focus {
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 2px ${theme.colors.primaryLight};
  }
`;

const SearchButton = styled.button`
  background-color: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin-left: ${theme.spacing.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: ${theme.colors.primaryDark};
  }
  
  svg {
    margin-right: ${props => props.children ? theme.spacing.sm : '0'};
  }
`;

const Controls = styled.div`
  display: flex;
  margin-bottom: ${theme.spacing.md};
  flex-wrap: wrap;
  gap: 10px;
`;

const FilterSection = styled.div`
  margin-right: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.sm};
`;

const FilterLabel = styled.div`
  font-size: 0.9rem;
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const FilterDropdown = styled.select`
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.sm};
  background-color: white;
  min-width: 150px;
`;

const DebugBox = styled.div`
  padding: 15px;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  margin-bottom: 20px;
`;

function SearchPage() {
  const { t, i18n } = useTranslation();
  
  // Type options based on language
  const typeOptions = i18n.language === 'de'
    ? [
        { value: 'ebook', label: 'E-Book' },
        { value: 'audiobook', label: 'Hörbuch' }
      ]
    : [
        { value: 'ebook', label: 'E-Book' },
        { value: 'audiobook', label: 'Audiobook' }
      ];
      
  // Fiction type options
  const fictionOptions = [
    { value: 'Fiction', label: i18n.language === 'de' ? 'Belletristik' : 'Fiction' },
    { value: 'Non-Fiction', label: i18n.language === 'de' ? 'Sachbuch' : 'Non-Fiction' }
  ];

  // State
  const [books, setBooks] = useState<any[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookType, setBookType] = useState<BookType | 'all'>('all');
  const [fictionFilter, setFictionFilter] = useState<'Fiction' | 'Non-Fiction' | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilterDebug, setShowFilterDebug] = useState(false);
  
  const { years } = useBookFilters();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // Get initial search term from URL
  useEffect(() => {
    const initialQuery = queryParams.get('q') || '';
    setSearchTerm(initialQuery);
  }, [location.search, queryParams]);
  
  // Load all books
  useEffect(() => {
    const fetchAllBooks = async () => {
      setIsLoading(true);
      
      try {
        console.log('Fetching all books from database');
        const { data, error, count } = await supabase
          .from('books')
          .select('*', { count: 'exact' });
        
        if (error) throw error;
        
        console.log(`Loaded ${data?.length || 0} books from database`);
        setBooks(data || []);
        setFilteredBooks(data || []);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllBooks();
  }, []); // Only run once on component mount
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search submitted with term:', searchTerm);
  };
  
  // Apply basic filtering (categories, etc.)
  useEffect(() => {
    if (books.length === 0) return;
    
    // Let the DirectFilterResults component handle the bookType and fictionType filtering
    // Here we just filter by categories
    
    let filtered = [...books];
    
    // Apply category filters
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(book => {
        // Check if any selected category matches book's categories or genre
        return selectedCategories.some(category => {
          if (book.categories && Array.isArray(book.categories)) {
            return book.categories.some((cat: string) => 
              cat.toLowerCase().includes(category.toLowerCase())
            );
          }
          // Fallback to genre if no categories
          return book.genre?.toLowerCase().includes(category.toLowerCase());
        });
      });
    }
    
    setFilteredBooks(filtered);
  }, [books, selectedCategories]);
  
  const toggleFilterDebug = () => {
    setShowFilterDebug(!showFilterDebug);
  };
  
  return (
    <Container>
      <CategorySidebar
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
      />
      
      <MainContent>
        <SearchContainer onSubmit={handleSearch}>
          <SearchInput
            type="text"
            placeholder={t('search.placeholder', 'Search books...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SearchButton type="submit">
            <FiSearch />
            {t('search.search', 'Search')}
          </SearchButton>
        </SearchContainer>
        
        <Controls>
          <FilterSection>
            <FilterLabel>{t('search.filterByType', 'Book Type')}</FilterLabel>
            <FilterDropdown
              value={bookType}
              onChange={(e) => setBookType(e.target.value as BookType | 'all')}
            >
              <option value="all">{t('search.allTypes', 'All Types')}</option>
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </FilterDropdown>
          </FilterSection>
          
          <FilterSection>
            <FilterLabel>{t('search.filterByFiction', 'Fiction Type')}</FilterLabel>
            <FilterDropdown
              value={fictionFilter || ''}
              onChange={(e) => setFictionFilter(e.target.value ? e.target.value as 'Fiction' | 'Non-Fiction' : null)}
            >
              <option value="">{t('search.allFictionTypes', 'All Fiction Types')}</option>
              {fictionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </FilterDropdown>
          </FilterSection>
          
          <FilterSection>
            <FilterLabel>{t('search.filterByYear', 'Year')}</FilterLabel>
            <FilterDropdown
              value={yearFilter || ''}
              onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">{t('search.allYears', 'All Years')}</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </FilterDropdown>
          </FilterSection>
          
          <FilterSection>
            <FilterLabel>
              <FiFilter /> {t('search.activeFilters', 'Active Filters')}
            </FilterLabel>
            <div>
              {selectedCategories.length > 0 && (
                <span>{t('search.categories', 'Categories')}: {selectedCategories.join(', ')} | </span>
              )}
              {bookType !== 'all' && (
                <span>{t('search.type', 'Type')}: {bookType} | </span>
              )}
              {fictionFilter && (
                <span>{t('search.fictionType', 'Fiction Type')}: {fictionFilter} | </span>
              )}
              {yearFilter && (
                <span>{t('search.year', 'Year')}: {yearFilter}</span>
              )}
            </div>
          </FilterSection>
          
          <button onClick={toggleFilterDebug} style={{ 
            padding: '5px 10px', 
            background: '#f0f0f0', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            {showFilterDebug ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>
        </Controls>
        
        {showFilterDebug && (
          <DebugBox>
            <h3>Filter Debug Information</h3>
            <p>Book Type: {bookType}</p>
            <p>Fiction Type: {fictionFilter || 'None'}</p>
            <p>Search Term: {searchTerm || 'None'}</p>
            <p>Selected Categories: {selectedCategories.length > 0 ? selectedCategories.join(', ') : 'None'}</p>
            <p>Year: {yearFilter || 'All'}</p>
            <p>Total Books: {books.length}</p>
            <p>Filtered Books: {filteredBooks.length}</p>
          </DebugBox>
        )}
        
        {isLoading ? (
          <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
        ) : error ? (
          <div style={{ 
            padding: theme.spacing.xl, 
            textAlign: 'center', 
            color: theme.colors.error 
          }}>
            {error.message}
          </div>
        ) : (
          <DirectFilterResults
            bookType={bookType === 'all' ? null : bookType}
            fictionType={fictionFilter}
            searchTerm={searchTerm}
          />
        )}
      </MainContent>
    </Container>
  );
}

export default SearchPage;
