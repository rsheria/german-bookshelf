import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiGrid, FiList } from 'react-icons/fi';
import BookCard from './BookCard';
import { Book } from '../types/supabase';
import theme from '../styles/theme';

const ListContainer = styled.div`
  width: 100%;
`;

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid ${theme.colors.border};
`;

const ResultCount = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textSecondary};
`;

const ViewToggleContainer = styled.div`
  display: flex;
`;

const ViewToggleButton = styled.button<{ active: boolean }>`
  padding: 6px 12px;
  background-color: ${props => props.active ? theme.colors.primary : theme.colors.backgroundAlt};
  color: ${props => props.active ? 'white' : theme.colors.text};
  border: 1px solid ${theme.colors.border};
  cursor: pointer;
  font-size: ${theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  
  &:first-child {
    border-radius: ${theme.borderRadius.md} 0 0 ${theme.borderRadius.md};
  }
  
  &:last-child {
    border-radius: 0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0;
  }
  
  &:hover {
    background-color: ${props => props.active ? theme.colors.primaryDark : theme.colors.backgroundAlt};
    opacity: ${props => props.active ? 1 : 0.8};
  }
`;

const GridView = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${theme.spacing.md};
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: ${theme.spacing.sm};
  }
`;

const ListView = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl} 0;
  color: ${theme.colors.textSecondary};
`;

const LoadMoreButton = styled.button`
  display: block;
  margin: ${theme.spacing.lg} auto;
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background-color: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  font-size: ${theme.typography.fontSize.md};
  font-weight: ${theme.typography.fontWeight.medium};
  box-shadow: ${theme.shadows.sm};
  
  &:hover {
    background-color: ${theme.colors.primaryLight};
    transform: translateY(-1px);
  }
  
  &:active {
    background-color: ${theme.colors.primaryDark};
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background-color: ${theme.colors.textSecondary};
  }
`;

interface BookListProps {
  books: Book[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const BookList: React.FC<BookListProps> = ({ 
  books, 
  loading, 
  hasMore, 
  onLoadMore 
}) => {
  const { t } = useTranslation();
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  
  if (books.length === 0 && !loading) {
    return (
      <EmptyState>
        <h3>{t('books.noResults')}</h3>
        <p>{t('books.tryAdjustingFilters')}</p>
      </EmptyState>
    );
  }
  
  return (
    <ListContainer>
      <ListHeader>
        <ResultCount>
          {books.length} {t('books.foundResults', { count: books.length })}
        </ResultCount>
        
        <ViewToggleContainer>
          <ViewToggleButton 
            active={viewType === 'grid'} 
            onClick={() => setViewType('grid')}
            aria-label={t('books.gridView')}
          >
            <FiGrid size={16} />
            {t('books.grid')}
          </ViewToggleButton>
          <ViewToggleButton 
            active={viewType === 'list'} 
            onClick={() => setViewType('list')}
            aria-label={t('books.listView')}
          >
            <FiList size={16} />
            {t('books.list')}
          </ViewToggleButton>
        </ViewToggleContainer>
      </ListHeader>
      
      {viewType === 'grid' ? (
        <GridView>
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </GridView>
      ) : (
        <ListView>
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </ListView>
      )}
      
      {hasMore && (
        <LoadMoreButton onClick={onLoadMore} disabled={loading}>
          {loading ? t('common.loading') : t('books.loadMore')}
        </LoadMoreButton>
      )}
    </ListContainer>
  );
};

export default BookList;
