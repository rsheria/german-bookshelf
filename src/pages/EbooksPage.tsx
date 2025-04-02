import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiBook, FiSearch } from 'react-icons/fi';
import BookGrid from '../components/BookGrid';
import { useBooks } from '../hooks/useBooks';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 0 1rem;
  width: 250px;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  padding: 0.75rem 0;
  outline: none;
  font-size: 1rem;
  width: 100%;
`;

const FilterDropdown = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 1rem;
  outline: none;
  cursor: pointer;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
`;

const PageButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: ${({ active }) => (active ? '#3498db' : 'white')};
  color: ${({ active }) => (active ? 'white' : '#333')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ active }) => (active ? '#2980b9' : '#f5f5f5')};
  }

  &:disabled {
    background-color: #f5f5f5;
    color: #999;
    cursor: not-allowed;
  }
`;

const EbooksPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(0);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
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
    <Container>
      <Header>
        <Title>
          <FiBook /> {t('nav.ebooks')}
        </Title>
        
        <Controls>
          <SearchBar>
            <FiSearch style={{ color: '#666', marginRight: '0.5rem' }} />
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
      </Header>
      
      <BookGrid 
        books={books} 
        isLoading={isLoading} 
        error={error} 
      />
      
      {totalPages > 1 && !isLoading && (
        <Pagination>
          {renderPagination()}
        </Pagination>
      )}
    </Container>
  );
};

export default EbooksPage;
