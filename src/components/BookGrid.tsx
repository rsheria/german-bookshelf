import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import BookCard from './BookCard';
import { Book } from '../types/supabase';
import { FiLoader } from 'react-icons/fi';

interface BookGridProps {
  books: Book[];
  isLoading: boolean;
  error: Error | null;
}

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    padding: 1rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
  grid-column: 1 / -1;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  grid-column: 1 / -1;
  font-size: 1.5rem;
  color: #2c3e50;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #e74c3c;
  grid-column: 1 / -1;
  border: 1px solid #e74c3c;
  border-radius: 8px;
  margin: 1rem;
`;

const Spinner = styled(FiLoader)`
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const BookGrid: React.FC<BookGridProps> = ({ books, isLoading, error }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <GridContainer>
        <LoadingState>
          <Spinner />
          {t('common.loading')}
        </LoadingState>
      </GridContainer>
    );
  }

  if (error) {
    return (
      <GridContainer>
        <ErrorState>
          {t('common.error')}: {error.message}
        </ErrorState>
      </GridContainer>
    );
  }

  if (books.length === 0) {
    return (
      <GridContainer>
        <EmptyState>{t('books.noBooks')}</EmptyState>
      </GridContainer>
    );
  }

  return (
    <GridContainer>
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </GridContainer>
  );
};

export default BookGrid;
