import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../services/supabase';

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.h1`
  margin-bottom: 20px;
  color: #333;
`;

const Categories = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
`;

const CategoryButton = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.active ? '#4285f4' : '#e0e0e0'};
  color: ${props => props.active ? 'white' : '#333'};
  cursor: pointer;
  font-weight: ${props => props.active ? 'bold' : 'normal'};

  &:hover {
    background-color: ${props => props.active ? '#3367d6' : '#d0d0d0'};
  }
`;

const BookGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const BookCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const BookCover = styled.div`
  height: 200px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const BookInfo = styled.div`
  padding: 15px;
`;

const BookTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
`;

const BookAuthor = styled.p`
  margin: 0 0 8px 0;
  color: #666;
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

const StatusBar = styled.div`
  background-color: #f9f9f9;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border-left: 4px solid #2196f3;
`;

const DiagnosticPage: React.FC = () => {
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState('Loading...');
  
  // Function to extract all unique categories from books
  const extractCategories = (booksData: any[]) => {
    const categories = new Set<string>();
    
    booksData.forEach(book => {
      // Add from categories array
      if (book.categories && Array.isArray(book.categories)) {
        book.categories.forEach((cat: string) => {
          if (typeof cat === 'string') {
            categories.add(cat.trim());
          }
        });
      }
      
      // Add from genre field
      if (book.genre) {
        const genreParts = book.genre.split(/[,>/&]+/).map((part: string) => part.trim());
        genreParts.forEach((part: string) => {
          if (part) categories.add(part);
        });
      }
    });
    
    return Array.from(categories).sort();
  };
  
  // Load all books on component mount
  useEffect(() => {
    const fetchAllBooks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('books').select('*');
        
        if (error) throw error;
        
        const allBooks = data || [];
        setBooks(allBooks);
        setAllCategories(extractCategories(allBooks));
        setFeedbackMessage(`Loaded ${allBooks.length} books`);
      } catch (err) {
        console.error('Error loading books:', err);
        setFeedbackMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllBooks();
  }, []);
  
  // Filter books whenever selected categories change
  useEffect(() => {
    if (selectedCategories.length === 0) {
      // When no categories selected, fetch all books
      const fetchAllBooks = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.from('books').select('*');
          
          if (error) throw error;
          
          setBooks(data || []);
          setFeedbackMessage(`Showing all ${data?.length || 0} books`);
        } catch (err) {
          console.error('Error:', err);
          setFeedbackMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAllBooks();
    } else {
      // Filter books by selected categories
      const fetchFilteredBooks = async () => {
        setLoading(true);
        try {
          // Start with base query
          let query = supabase.from('books').select('*');
          
          // Build filters for each category
          const filters: string[] = [];
          
          for (const category of selectedCategories) {
            const cat = category.toLowerCase().trim();
            
            // Add both conditions: check in genre and in categories array
            filters.push(`genre.ilike.%${cat}%`);
            filters.push(`categories.cs.{"${cat}"}`);
          }
          
          // Apply all filters with OR logic
          if (filters.length > 0) {
            console.log('DIAGNOSTIC: Using filter string:', filters.join(','));
            query = query.or(filters.join(','));
          }
          
          // Execute query
          const { data, error } = await query;
          
          if (error) throw error;
          
          setBooks(data || []);
          setFeedbackMessage(`Found ${data?.length || 0} books matching: ${selectedCategories.join(', ')}`);
        } catch (err) {
          console.error('Filter error:', err);
          setFeedbackMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
          setLoading(false);
        }
      };
      
      fetchFilteredBooks();
    }
  }, [selectedCategories]);
  
  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };
  
  return (
    <Container>
      <Header>Category Filtering Diagnostic Page</Header>
      
      <StatusBar>
        {loading ? 'Loading...' : feedbackMessage}
      </StatusBar>
      
      <h2>Categories</h2>
      <p>Click to toggle categories:</p>
      
      <Categories>
        {allCategories.map(category => (
          <CategoryButton 
            key={category}
            active={selectedCategories.includes(category)}
            onClick={() => toggleCategory(category)}
          >
            {category}
          </CategoryButton>
        ))}
      </Categories>
      
      <h2>Books ({books.length})</h2>
      
      {loading ? (
        <p>Loading books...</p>
      ) : books.length === 0 ? (
        <p>No books found matching the selected categories.</p>
      ) : (
        <BookGrid>
          {books.map(book => (
            <BookCard key={book.id}>
              <BookCover>
                <img 
                  src={book.cover_url || 'https://via.placeholder.com/300x200?text=No+Cover'} 
                  alt={book.title} 
                />
              </BookCover>
              <BookInfo>
                <BookTitle>{book.title}</BookTitle>
                <BookAuthor>by {book.author}</BookAuthor>
                {book.genre && <p>Genre: {book.genre}</p>}
                
                <BookCategories>
                  {Array.isArray(book.categories) && book.categories.map((cat: string, index: number) => (
                    <CategoryTag key={index}>{cat}</CategoryTag>
                  ))}
                </BookCategories>
              </BookInfo>
            </BookCard>
          ))}
        </BookGrid>
      )}
    </Container>
  );
};

export default DiagnosticPage;
