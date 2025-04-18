import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../services/supabase';
import { Book } from '../types/supabase';
import theme from '../styles/theme';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.h1`
  color: ${theme.colors.primary};
  margin-bottom: 1.5rem;
`;

const Card = styled.div`
  background-color: ${theme.colors.card};
  border-radius: ${theme.borderRadius.lg};
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid ${theme.colors.border};
  box-shadow: ${theme.shadows.md};
`;

const Button = styled.button`
  background-color: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  margin-right: 1rem;
  margin-bottom: 1rem;
  
  &:hover {
    background-color: ${theme.colors.primaryDark};
  }
  
  &:disabled {
    background-color: ${theme.colors.textMuted};
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div<{ isError?: boolean }>`
  background-color: ${props => props.isError ? '#ffecec' : '#e6f7ff'};
  border: 1px solid ${props => props.isError ? '#ffb1b1' : '#91d5ff'};
  color: ${props => props.isError ? '#cf1322' : '#1890ff'};
  padding: 1rem;
  border-radius: ${theme.borderRadius.md};
  margin-bottom: 1.5rem;
`;

const BookGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`;

const BookCard = styled.div`
  background-color: ${theme.colors.backgroundAlt};
  border-radius: ${theme.borderRadius.md};
  padding: 1rem;
  border: 1px solid ${theme.colors.border};
`;

const BookTitle = styled.h3`
  color: ${theme.colors.text};
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
`;

const Stats = styled.div`
  background-color: ${theme.colors.backgroundAlt};
  padding: 1rem;
  border-radius: ${theme.borderRadius.md};
  margin-bottom: 1.5rem;
  border: 1px solid ${theme.colors.border};
`;

// Helper to determine fiction type based on genre
const determineFictionType = (book: Book): 'Fiction' | 'Non-Fiction' => {
  // Common non-fiction categories/keywords
  const nonFictionKeywords = [
    'biography', 'autobiography', 'memoir', 'history', 'science', 
    'technology', 'business', 'economics', 'politics', 'philosophy',
    'psychology', 'self-help', 'health', 'medicine', 'education',
    'reference', 'travel', 'cooking', 'crafts', 'hobbies', 'art',
    'music', 'sports', 'religion', 'spirituality', 'true crime',
    'sachbuch', 'ratgeber', 'wissenschaft', 'philosophie', 'geschichte',
    'biografie', 'memoiren', 'wirtschaft', 'politik', 'bildung',
    'gesundheit', 'kochen', 'reise', 'sport', 'religion'
  ];
  
  // Check if any non-fiction keywords exist in the genre
  const genre = (book.genre || '').toLowerCase();
  const isNonFiction = nonFictionKeywords.some(keyword => 
    genre.includes(keyword.toLowerCase())
  );
  
  return isNonFiction ? 'Non-Fiction' : 'Fiction';
};

const UpdateBooksUtil: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    withFictionType: 0,
    fiction: 0,
    nonFiction: 0
  });
  
  useEffect(() => {
    fetchBooks();
  }, []);
  
  const fetchBooks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*');
      
      if (error) throw error;
      
      setBooks(data || []);
      
      // Calculate stats
      const withFictionType = data?.filter(book => book.fictionType !== null && book.fictionType !== undefined).length || 0;
      const fiction = data?.filter(book => book.fictionType === 'Fiction').length || 0;
      const nonFiction = data?.filter(book => book.fictionType === 'Non-Fiction').length || 0;
      
      setStats({
        total: data?.length || 0,
        withFictionType,
        fiction,
        nonFiction
      });
      
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to fetch books');
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateBooksWithFictionType = async () => {
    setIsLoading(true);
    setError(null);
    setMessage('Updating books with fiction types...');
    
    try {
      // For each book without a fiction type, determine and update
      const booksToUpdate = books.filter(book => !book.fictionType);
      let updatedCount = 0;
      
      for (const book of booksToUpdate) {
        const fictionType = determineFictionType(book);
        
        const { error } = await supabase
          .from('books')
          .update({ fictionType })
          .eq('id', book.id);
        
        if (error) {
          console.error(`Error updating book ${book.id}:`, error);
        } else {
          updatedCount++;
        }
      }
      
      setMessage(`Successfully updated ${updatedCount} books with fiction types.`);
      
      // Refresh book list
      fetchBooks();
      
    } catch (err) {
      console.error('Error updating books:', err);
      setError('Failed to update books with fiction types');
    } finally {
      setIsLoading(false);
    }
  };
  
  const sampleFictionTypeUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setMessage('Updating a few sample books...');
    
    try {
      // For testing, update 5 books to Fiction and 5 to Non-Fiction
      const booksWithoutType = books.filter(book => !book.fictionType);
      const sampleBooks = booksWithoutType.slice(0, 10);
      
      for (let i = 0; i < sampleBooks.length; i++) {
        const fictionType = i < 5 ? 'Fiction' : 'Non-Fiction';
        
        const { error } = await supabase
          .from('books')
          .update({ fictionType })
          .eq('id', sampleBooks[i].id);
        
        if (error) {
          console.error(`Error updating sample book ${sampleBooks[i].id}:`, error);
        }
      }
      
      setMessage(`Successfully updated 10 sample books with fiction types.`);
      
      // Refresh book list
      fetchBooks();
      
    } catch (err) {
      console.error('Error updating sample books:', err);
      setError('Failed to update sample books');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Container>
      <Header>Database Utility: Update Books with Fiction Types</Header>
      
      <Card>
        <h2>Book Fiction Type Statistics</h2>
        <Stats>
          <p><strong>Total Books:</strong> {stats.total}</p>
          <p><strong>Books with Fiction Type:</strong> {stats.withFictionType} ({((stats.withFictionType / stats.total) * 100).toFixed(1)}%)</p>
          <p><strong>Fiction Books:</strong> {stats.fiction}</p>
          <p><strong>Non-Fiction Books:</strong> {stats.nonFiction}</p>
        </Stats>
        
        <Button 
          onClick={fetchBooks} 
          disabled={isLoading}
        >
          Refresh Data
        </Button>
        
        <Button 
          onClick={updateBooksWithFictionType} 
          disabled={isLoading}
        >
          Update All Books
        </Button>
        
        <Button 
          onClick={sampleFictionTypeUpdate} 
          disabled={isLoading}
        >
          Update Sample Books
        </Button>
        
        {message && <StatusMessage>{message}</StatusMessage>}
        {error && <StatusMessage isError>{error}</StatusMessage>}
      </Card>
      
      <Card>
        <h2>Books without Fiction Type ({books.filter(book => !book.fictionType).length})</h2>
        <BookGrid>
          {books
            .filter(book => !book.fictionType)
            .slice(0, 12)
            .map(book => (
              <BookCard key={book.id}>
                <BookTitle>{book.title}</BookTitle>
                <p><strong>Type:</strong> {book.type}</p>
                <p><strong>Genre:</strong> {book.genre || 'Not specified'}</p>
                <p><strong>Fiction Type (auto-detect):</strong> {determineFictionType(book)}</p>
              </BookCard>
            ))}
        </BookGrid>
      </Card>
      
      <Card>
        <h2>Books with Fiction Type ({books.filter(book => book.fictionType).length})</h2>
        <BookGrid>
          {books
            .filter(book => book.fictionType)
            .slice(0, 12)
            .map(book => (
              <BookCard key={book.id}>
                <BookTitle>{book.title}</BookTitle>
                <p><strong>Type:</strong> {book.type}</p>
                <p><strong>Fiction Type:</strong> {book.fictionType}</p>
                <p><strong>Genre:</strong> {book.genre || 'Not specified'}</p>
              </BookCard>
            ))}
        </BookGrid>
      </Card>
    </Container>
  );
};

export default UpdateBooksUtil;
