import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { supabase } from '../services/supabase';
import BookGrid from '../components/BookGrid';
import { Book } from '../types/supabase';
import { LoadingState } from '../styles/adminStyles';
import theme from '../styles/theme';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.lg} ${theme.spacing.md};
`;

const Title = styled.h1`
  margin-bottom: ${theme.spacing.lg};
`;

const CategoryPage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .ilike('genre', `%${category}%`);
        if (error) throw error;
        setBooks(data || []);
      } catch (err: any) {
        setError(err.message || 'Error fetching books');
      } finally {
        setLoading(false);
      }
    }
    if (category) fetchBooks();
  }, [category]);

  return (
    <PageContainer>
      <Title>Category: {category}</Title>
      {loading && <LoadingState>Loading...</LoadingState>}
      {error && <div style={{ color: theme.colors.error }}>{error}</div>}
      {!loading && !error && books.length === 0 && (
        <div>No books found for this category.</div>
      )}
      {!loading && !error && books.length > 0 && (
        <BookGrid books={books} isLoading={false} error={null} />
      )}
    </PageContainer>
  );
};

export default CategoryPage;
