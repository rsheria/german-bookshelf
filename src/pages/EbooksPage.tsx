import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiBook, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import BookGrid from '../components/BookGrid';
import { useBooks } from '../hooks/useBooks';
import { useSessionCheck } from '../hooks/useSessionCheck';
import theme from '../styles/theme';
import { AdminContainer, LoadingState } from '../styles/adminStyles';

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
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  font-family: ${props => props.theme.typography.fontFamily.heading};
  font-weight: ${theme.typography.fontWeight.bold};
`;

const Controls = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.xl};
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background-color: ${props => props.theme.colors.card};
  border-radius: ${theme.borderRadius.md};
  padding: 0 ${theme.spacing.md};
  width: 280px;
  border: 1px solid ${props => props.theme.colors.border};
  transition: all 0.3s ease;
  
  &:focus-within {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
  }
  
  @media (max-width: 480px) {
    width: 100%;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  padding: ${theme.spacing.sm} 0;
  outline: none;
  font-size: ${theme.typography.fontSize.md};
  width: 100%;
  color: ${props => props.theme.colors.text};
  
  &::placeholder {
    color: ${props => props.theme.colors.textLight};
  }
`;

const FilterDropdown = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background-color: ${props => props.theme.colors.card};
  font-size: ${theme.typography.fontSize.md};
  outline: none;
  cursor: pointer;
  color: ${props => props.theme.colors.text};
  transition: all 0.3s ease;
  min-width: 180px;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
  }
  
  &:hover {
    border-color: ${props => props.theme.colors.primary}80;
  }
  
  @media (max-width: 480px) {
    width: 100%;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
  flex-wrap: wrap;
`;

const PageButton = styled.button<{ active?: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background-color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.card};
  color: ${props => props.active ? 'white' : props.theme.colors.text};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  font-weight: ${props => props.active ? theme.typography.fontWeight.medium : theme.typography.fontWeight.normal};
  box-shadow: ${props => props.theme.shadows.sm};
  
  &:hover {
    background-color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.backgroundAlt};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.md};
  }
  
  &:disabled {
    background-color: ${props => props.theme.colors.backgroundAlt};
    color: ${props => props.theme.colors.textLight};
    cursor: not-allowed;
    border-color: ${props => props.theme.colors.border};
    transform: none;
    box-shadow: none;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${props => props.theme.colors.textLight};
  background-color: ${props => props.theme.colors.backgroundAlt}30;
  border-radius: ${theme.borderRadius.md};
  margin: ${theme.spacing.xl} 0;
  
  h3 {
    margin-bottom: ${theme.spacing.md};
    color: ${props => props.theme.colors.text};
    font-family: ${props => props.theme.typography.fontFamily.heading};
  }
  
  p {
    max-width: 500px;
    margin: 0 auto;
  }
`;

const EbooksPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(0);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Use the session check hook to maintain session on refresh
  useSessionCheck();
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0); // Reset to first page on new search
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const { 
    books, 
    isLoading, 
    error, 
    totalCount 
  } = useBooks({
    type: 'ebook',
    searchTerm: debouncedSearchTerm,
    genre: genre,
    page: page,
    limit: 12
  });
  
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
        <FiChevronLeft />
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
        <FiChevronRight />
      </PageButton>
    );
    
    return buttons;
  };
  
  return (
    <AdminContainer>
      <PageHeader>
        <PageTitle>
          <FiBook /> {t('nav.ebooks')}
        </PageTitle>
      </PageHeader>
      
      <Controls>
        <SearchBar>
          <FiSearch style={{ color: theme.colors.textLight, marginRight: theme.spacing.sm }} />
          <SearchInput
            type="text"
            placeholder={t('nav.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBar>
        
        <FilterDropdown
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            setPage(0); // Reset to first page on filter change
          }}
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
      </Controls>
      
      {isLoading ? (
        <LoadingState>{t('common.loading')}</LoadingState>
      ) : error ? (
        <div style={{ 
          padding: theme.spacing.xl, 
          textAlign: 'center', 
          color: theme.colors.error,
          backgroundColor: `${theme.colors.error}10`,
          borderRadius: theme.borderRadius.md,
          margin: `${theme.spacing.xl} 0`
        }}>
          {error.message}
        </div>
      ) : books && books.length > 0 ? (
        <BookGrid 
          books={books} 
          isLoading={false} 
          error={null} 
        />
      ) : (
        <EmptyState>
          <h3>{t('books.noResults')}</h3>
          <p>{t('books.tryDifferentSearch')}</p>
        </EmptyState>
      )}
      
      {totalPages > 1 && !isLoading && books && books.length > 0 && (
        <Pagination>
          {renderPagination()}
        </Pagination>
      )}
    </AdminContainer>
  );
};

export default EbooksPage;
