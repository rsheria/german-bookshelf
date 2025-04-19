import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import BookCard from './BookCard';
import SkeletonBookCard from './SkeletonBookCard';
import { Book } from '../types/supabase';
import { FiLoader, FiAlertCircle, FiBookOpen } from 'react-icons/fi';
import theme from '../styles/theme';

interface BookGridProps {
  books: Book[];
  isLoading: boolean;
  error: Error | null;
  title?: string;
  subtitle?: string;
}

const Section = styled.section`
  margin-bottom: ${theme.spacing['2xl']};
`;

const SectionHeader = styled.div`
  margin-bottom: ${theme.spacing.xl};
  text-align: center;
`;

const Title = styled.h2`
  font-family: ${theme.typography.fontFamily.heading};
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary};
  margin-bottom: ${theme.spacing.xs};
  position: relative;
  display: inline-block;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 70px;
    height: 3px;
    background-color: ${theme.colors.secondary};
    border-radius: ${theme.borderRadius.full};
  }
`;

const Subtitle = styled.p`
  font-size: ${theme.typography.fontSize.lg};
  color: ${theme.colors.textSecondary};
  max-width: 600px;
  margin: ${theme.spacing.lg} auto 0;
  line-height: ${theme.typography.lineHeight.relaxed};
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${theme.spacing.xl};
  padding: ${theme.spacing.xl};
  transition: all ${theme.transitions.normal};

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: ${theme.spacing.lg};
    padding: ${theme.spacing.lg};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing['2xl']};
  color: ${theme.colors.textMuted};
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  
  svg {
    font-size: 3rem;
    color: ${theme.colors.primary};
    opacity: 0.4;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing['2xl']};
  grid-column: 1 / -1;
  font-size: ${theme.typography.fontSize.xl};
  color: ${theme.colors.primary};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.error};
  grid-column: 1 / -1;
  border: 1px solid ${theme.colors.error};
  border-radius: ${theme.borderRadius.lg};
  margin: ${theme.spacing.md};
  background-color: rgba(231, 76, 60, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  
  svg {
    font-size: 2.5rem;
    color: ${theme.colors.error};
  }
`;

const Spinner = styled(FiLoader)`
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  margin-right: ${theme.spacing.md};
  font-size: 2rem;
  color: ${theme.colors.primary};
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const BookGrid: React.FC<BookGridProps> = ({ books = [], isLoading = false, error = null, title, subtitle }) => {
  // Debug info about current books
  console.log('BOOK GRID RENDERING WITH', books.length, 'BOOKS');
  const { t } = useTranslation();

  const renderContent = () => {
    // Initial load: show skeleton placeholders
    if (isLoading && books.length === 0) {
      return Array.from({ length: 4 }).map((_, idx) => (
        <SkeletonBookCard key={idx} />
      ));
    }

    // Error on initial load
    if (error && books.length === 0) {
      return (
        <ErrorState>
          <FiAlertCircle />
          <div>
            <h3>{t('common.error')}</h3>
            <p>{error.message}</p>
          </div>
        </ErrorState>
      );
    }

    // No results after loading
    if (!isLoading && books.length === 0) {
      return (
        <EmptyState>
          <FiBookOpen />
          <h3>{t('books.noBooks')}</h3>
          <p>{t('books.noBooksSuggestion', 'Try adjusting your filters or check back later for new additions.')}</p>
        </EmptyState>
      );
    }

    // Render books and spinner for subsequent loads
    return (
      <>
        {books.map(book => (
          <BookCard key={book.id} book={book} />
        ))}
        {isLoading && (
          <LoadingState>
            <Spinner />
            {t('common.loading')}
          </LoadingState>
        )}
      </>
    );
  };

  return (
    <Section>
      {(title || subtitle) && (
        <SectionHeader>
          {title && <Title>{title}</Title>}
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </SectionHeader>
      )}
      <GridContainer>
        {renderContent()}
      </GridContainer>
    </Section>
  );
};

export default BookGrid;
