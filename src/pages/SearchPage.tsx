import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiSearch, FiFilter } from 'react-icons/fi';
import BookGrid from '../components/BookGrid';
import { useBooks } from '../hooks/useBooks';
import { AdminContainer, LoadingState } from '../styles/adminStyles';
import theme from '../styles/theme';

const PageHeader = styled.div`
  margin-bottom: ${props => props.theme.spacing.xl};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -${props => props.theme.spacing.sm};
    left: 0;
    width: 80px;
    height: 3px;
    background-color: ${props => props.theme.colors.secondary};
    border-radius: ${props => props.theme.borderRadius.full};
  }
`;

const PageTitle = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  color: ${props => props.theme.colors.primary};
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  font-family: ${props => props.theme.typography.fontFamily.heading};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const Controls = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  flex-wrap: wrap;
  margin-bottom: ${props => props.theme.spacing.xl};
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background-color: ${props => props.theme.colors.card};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: 0 ${props => props.theme.spacing.md};
  flex-grow: 1;
  max-width: 400px;
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all 0.3s ease;
  
  &:focus-within {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  padding: ${props => props.theme.spacing.md} 0;
  outline: none;
  font-size: ${props => props.theme.typography.fontSize.md};
  width: 100%;
  color: ${props => props.theme.colors.text};
  
  &::placeholder {
    color: ${props => props.theme.colors.textMuted};
  }
`;

const FilterDropdown = styled.select`
  padding: ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.card};
  font-size: ${props => props.theme.typography.fontSize.md};
  color: ${props => props.theme.colors.text}; /* Ensure text is visible in both modes */
  outline: none;
  cursor: pointer;
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all 0.3s ease;
  font-weight: ${props => props.theme.typography.fontWeight.medium}; /* Added font weight */
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
  }
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background-color: ${props => props.theme.colors.backgroundAlt};
  }

  option {
    background-color: ${props => props.theme.colors.backgroundAlt};
    color: ${props => props.theme.colors.text}; /* Ensure option text is visible */
    padding: ${props => props.theme.spacing.md};
    font-weight: ${props => props.theme.typography.fontWeight.normal};
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  margin-top: ${props => props.theme.spacing.xl};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const PageButton = styled.button<{ active?: boolean }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: 1px solid ${({ active, theme }) => active ? theme.colors.primary : theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.card};
  color: ${({ active, theme }) => active ? 'white' : theme.colors.text};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: ${props => props.theme.typography.fontSize.md};
  box-shadow: ${props => props.theme.shadows.sm};

  &:hover {
    background-color: ${({ active, theme }) => active ? theme.colors.primaryDark : theme.colors.backgroundAlt};
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: ${props => props.theme.colors.backgroundAlt};
    color: ${props => props.theme.colors.textLight};
    cursor: not-allowed;
    transform: none;
  }
`;

const ResultsInfo = styled.div`
  font-size: ${props => props.theme.typography.fontSize.md};
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [bookType, setBookType] = useState('');
  const [genre, setGenre] = useState('');
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  
  const { 
    books, 
    isLoading, 
    error, 
    totalCount,
    fetchBooks
  } = useBooks({
    type: bookType as any,
    searchTerm,
    genre,
    year: yearFilter,
    page,
    limit: 12
  });
  
  // Update search when URL query changes
  useEffect(() => {
    const newQuery = queryParams.get('q') || '';
    setSearchTerm(newQuery);
    setPage(0);
  }, [location.search]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBooks();
  };
  
  const totalPages = Math.ceil(totalCount / 12);
  
  // Generate pagination buttons
  const renderPagination = () => {
    const buttons = [];
    
    // Previous button
    buttons.push(
      <PageButton 
        key="prev" 
        onClick={() => setPage(prev => Math.max(0, prev - 1))}
        disabled={page === 0}
      >
        {t('common.previous')}
      </PageButton>
    );
    
    // Page numbers
    const startPage = Math.max(0, page - 2);
    const endPage = Math.min(totalPages - 1, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <PageButton 
          key={i} 
          active={i === page}
          onClick={() => setPage(i)}
        >
          {i + 1}
        </PageButton>
      );
    }
    
    // Next button
    buttons.push(
      <PageButton 
        key="next" 
        onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
        disabled={page >= totalPages - 1}
      >
        {t('common.next')}
      </PageButton>
    );
    
    return buttons;
  };
  
  return (
    <AdminContainer>
      <PageHeader>
        <PageTitle>
          <FiSearch /> {t('books.searchResults')}
        </PageTitle>
        {searchTerm && (
          <ResultsInfo>
            {t('books.showingResultsFor')}: "{searchTerm}"
            {totalCount !== undefined && ` (${totalCount} ${t('books.results')})`}
          </ResultsInfo>
        )}
      </PageHeader>
      
      <Controls>
        <form onSubmit={handleSearch} style={{ flexGrow: 1, maxWidth: '500px' }}>
          <SearchBar>
            <FiSearch style={{ color: theme.colors.textMuted, marginRight: theme.spacing.sm }} />
            <SearchInput
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>
        </form>
        
        <div style={{ display: 'flex', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: theme.spacing.xs, 
            color: theme.colors.text,
            fontWeight: 600 /* Make the filter label bold */
          }}>
            <FiFilter />
            <span style={{ fontWeight: 600 }}>{t('books.filterBy', 'Filter by')}:</span>
          </div>
          
          <FilterDropdown
            value={bookType}
            onChange={(e) => {
              setBookType(e.target.value);
              setPage(0); // Reset to first page on filter change
            }}
            aria-label={t('books.filterByType', 'Filter by Type')}
          >
            <option value="">{t('books.allTypes')}</option>
            <option value="audiobook">{t('books.audiobook')}</option>
            <option value="ebook">{t('books.ebook')}</option>
          </FilterDropdown>
          
          <FilterDropdown
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              setPage(0); // Reset to first page on filter change
            }}
            aria-label={t('books.filterByGenre', 'Filter by Genre')}
          >
            <option value="">{t('books.allGenres')}</option>
            <option value="Fiction">Fiction</option>
            <option value="Non-Fiction">Non-Fiction</option>
            <option value="Science Fiction">Science Fiction</option>
            <option value="Fantasy">Fantasy</option>
            <option value="Mystery">Mystery</option>
            <option value="Thriller">Thriller</option>
            <option value="Romance">Romance</option>
            <option value="Biography">Biography</option>
            <option value="History">History</option>
            <option value="Self-Help">Self-Help</option>
          </FilterDropdown>

          <FilterDropdown
            value={yearFilter || ''}
            onChange={(e) => {
              setYearFilter(e.target.value ? Number(e.target.value) : null);
              setPage(0); // Reset to first page on filter change
            }}
            aria-label={t('books.filterByYear', 'Filter by Year')}
          >
            <option value="">{t('books.allYears', 'All Years')}</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
          </FilterDropdown>
        </div>
      </Controls>
      
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
          borderRadius: theme.borderRadius.md
        }}>
          {t('books.noResults')}
        </div>
      ) : (
        <BookGrid books={books} isLoading={false} error={null} />
      )}
      
      {totalPages > 1 && !isLoading && (
        <Pagination>
          {renderPagination()}
        </Pagination>
      )}
    </AdminContainer>
  );
};

export default SearchPage;
