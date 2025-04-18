import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Book } from '../types/supabase';
import styled from 'styled-components';

// Styled components
const Container = styled.div`
  margin-top: 20px;
`;

const DebugContainer = styled.div`
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
  
  pre {
    margin: 0;
    white-space: pre-wrap;
    font-family: monospace;
  }
`;

const BookCard = styled.div`
  display: flex;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const BookCover = styled.div`
  width: 100px;
  height: 150px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const BookInfo = styled.div`
  padding: 15px;
  flex: 1;
`;

const BookTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
`;

const BookAuthor = styled.p`
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
`;

const BookCategories = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
`;

const CategoryTag = styled.span`
  background-color: #e0f2f1;
  color: #00796b;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
`;

interface DirectFilteredBooksProps {
  selectedCategories: string[];
}

export const DirectFilteredBooks: React.FC<DirectFilteredBooksProps> = ({ selectedCategories }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchFilteredBooks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Start with basic query
        let query = supabase.from('books').select('*');
        
        // Apply category filters if any are selected
        if (selectedCategories && selectedCategories.length > 0) {
          console.log('Direct filtering by categories:', selectedCategories);
          
          // Build filters for each category
          const filters: string[] = [];
          
          for (const category of selectedCategories) {
            const cat = category.toLowerCase().trim();
            
            // Add filters for both genre and categories array
            filters.push(`genre.ilike.%${cat}%`);
            filters.push(`categories.cs.{"${cat}"}`);
          }
          
          // Apply filters with OR logic between them
          if (filters.length > 0) {
            const filterStr = filters.join(',');
            console.log('Filter string:', filterStr);
            query = query.or(filterStr);
          }
        }
        
        // Execute query
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        console.log(`Found ${data?.length || 0} books matching categories:`, selectedCategories);
        setBooks(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch books');
        setLoading(false);
      }
    };
    
    fetchFilteredBooks();
  }, [selectedCategories]);
  
  // Render loading state
  if (loading) {
    return <div>Loading filtered books...</div>;
  }
  
  // Render error state
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  // No books found
  if (books.length === 0) {
    return <div>No books found matching the selected categories.</div>;
  }
  
  return (
    <Container>
      <DebugContainer>
        <h3>Debug Information</h3>
        <p>Selected Categories: {selectedCategories.join(', ') || 'None'}</p>
        <p>Found {books.length} matching books</p>
      </DebugContainer>
      
      {books.map(book => (
        <BookCard key={book.id}>
          <BookCover>
            <img src={book.cover_url || 'https://via.placeholder.com/100x150?text=No+Cover'} alt={book.title} />
          </BookCover>
          <BookInfo>
            <BookTitle>{book.title}</BookTitle>
            <BookAuthor>by {book.author}</BookAuthor>
            {book.genre && <p>Genre: {book.genre}</p>}
            
            <BookCategories>
              {Array.isArray(book.categories) && book.categories.map((cat, index) => (
                <CategoryTag key={index}>{cat}</CategoryTag>
              ))}
            </BookCategories>
          </BookInfo>
        </BookCard>
      ))}
    </Container>
  );
};

export default DirectFilteredBooks;
