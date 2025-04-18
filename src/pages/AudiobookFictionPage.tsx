import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { supabase } from '../services/supabase';
import BookGrid from '../components/BookGrid';
import { LoadingState } from '../styles/adminStyles';
import theme from '../styles/theme';

const Container = styled.div`
  padding: ${theme.spacing.lg};
`;

const Header = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary};
  margin-bottom: ${theme.spacing.sm};
`;

const Description = styled.p`
  font-size: 1rem;
  color: ${theme.colors.textSecondary};
  max-width: 800px;
`;

const AudiobookFictionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchBooks = async () => {
      setIsLoading(true);
      
      try {
        // Direct database query with BOTH filters applied together
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .eq('type', 'audiobook')
          .eq('fictionType', 'Fiction');
        
        if (error) throw error;
        
        console.log(`Found ${data?.length || 0} Fiction Audiobooks`);
        setBooks(data || []);
      } catch (err) {
        console.error('Error fetching Fiction Audiobooks:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch books'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBooks();
  }, []);
  
  return (
    <Container>
      <Header>
        <Title>{i18n.language === 'de' ? 'Belletristik Hörbücher' : 'Fiction Audiobooks'}</Title>
        <Description>
          {i18n.language === 'de' 
            ? 'Entdecken Sie unsere Sammlung an Belletristik-Hörbüchern.' 
            : 'Explore our collection of fiction audiobooks.'}
        </Description>
      </Header>
      
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
      ) : (
        <BookGrid books={books} isLoading={false} error={null} />
      )}
    </Container>
  );
};

export default AudiobookFictionPage;
