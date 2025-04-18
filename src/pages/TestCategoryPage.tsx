import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import styled from 'styled-components';

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.h1`
  margin-bottom: 20px;
`;

const Categories = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  border: 1px solid #ddd;
  padding: 15px;
  background: #f9f9f9;
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

const BookCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  background: white;
  display: flex;
`;

const BookCover = styled.div`
  width: 100px;
  min-width: 100px;
  height: 150px;
  margin-right: 15px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
  }
`;

const BookInfo = styled.div`
  flex: 1;
`;

const BookTitle = styled.h3`
  margin: 0 0 5px 0;
`;

const BookAuthor = styled.p`
  margin: 0 0 10px 0;
  color: #666;
`;

const BookCategories = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
`;

const CategoryTag = styled.span`
  background-color: #e0f2f1;
  color: #00796b;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
`;

const LoadingMessage = styled.div`
  padding: 20px;
  text-align: center;
  font-weight: bold;
  color: #666;
`;

const ErrorMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: red;
  border: 1px solid red;
  border-radius: 4px;
  margin: 20px 0;
`;

const InfoPanel = styled.div`
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
`;

const ClearButton = styled.button`
  background-color: #ff4d4f;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  
  &:hover {
    background-color: #ff7875;
  }
`;

const TestCategoryPage: React.FC = () => {
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Extract all unique categories from books
  const extractCategories = (books: any[]) => {
    const categorySet = new Set<string>();
    
    books.forEach(book => {
      // Extract from categories array
      if (book.categories && Array.isArray(book.categories)) {
        book.categories.forEach((cat: string) => {
          if (typeof cat === 'string' && cat.trim()) {
            categorySet.add(cat.trim());
          }
        });
      }
      
      // Extract from genre field
      if (book.genre) {
        book.genre.split(/[,>/&]+/).forEach((part: string) => {
          const trimmed = part.trim();
          if (trimmed) categorySet.add(trimmed);
        });
      }
    });
    
    return Array.from(categorySet).sort();
  };
  
  // Load all books on component mount
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*');
        
        if (error) throw error;
        
        console.log(`Loaded ${data?.length || 0} books from database`);
        setAllBooks(data || []);
        setFilteredBooks(data || []);
        setCategories(extractCategories(data || []));
      } catch (err) {
        console.error('Error loading books:', err);
        setError(err instanceof Error ? err.message : 'Failed to load books');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooks();
  }, []);
  
  // Apply category filtering
  useEffect(() => {
    if (selectedCategories.length === 0) {
      // No categories selected, show all books
      setFilteredBooks(allBooks);
      return;
    }
    
    // Use Supabase for filtering
    const filterBooks = async () => {
      setLoading(true);
      
      try {
        console.log('Filtering by categories:', selectedCategories);
        
        // Start with base query
        let query = supabase.from('books').select('*');
        
        // Build filter conditions for selected categories
        const conditions: string[] = [];
        
        selectedCategories.forEach(category => {
          const cat = category.toLowerCase().trim();
          console.log(`Building filter for: "${cat}"`);
          
          // Check in both genre and categories array
          conditions.push(`genre.ilike.%${cat}%`);
          conditions.push(`categories.cs.{"${cat}"}`);
        });
        
        // Apply all conditions with OR logic
        if (conditions.length > 0) {
          const filterString = conditions.join(',');
          console.log('Filter string:', filterString);
          query = query.or(filterString);
        }
        
        // Execute query
        const { data, error } = await query;
        
        if (error) throw error;
        
        console.log(`Found ${data?.length || 0} books matching the categories`);
        setFilteredBooks(data || []);
      } catch (err) {
        console.error('Error filtering books:', err);
        setError(`Error filtering: ${err instanceof Error ? err.message : 'Unknown error'}`);
        // Fall back to unfiltered books
        setFilteredBooks(allBooks);
      } finally {
        setLoading(false);
      }
    };
    
    filterBooks();
  }, [selectedCategories, allBooks]);
  
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
  
  // Clear all selected categories
  const clearCategories = () => {
    setSelectedCategories([]);
  };
  
  if (error) {
    return (
      <Container>
        <Header>Test Category Filtering</Header>
        <ErrorMessage>Error: {error}</ErrorMessage>
      </Container>
    );
  }
  
  return (
    <Container>
      <Header>Test Category Filtering</Header>
      
      <InfoPanel>
        <h3>Instructions</h3>
        <p>Click on categories below to filter books. Click a selected category to deselect it.</p>
        
        <h3>Status</h3>
        <p><strong>Total Books:</strong> {allBooks.length}</p>
        <p><strong>Filtered Books:</strong> {filteredBooks.length}</p>
        <p>
          <strong>Selected Categories:</strong> {selectedCategories.length > 0 
            ? selectedCategories.join(', ') 
            : 'None'}
        </p>
        
        {selectedCategories.length > 0 && (
          <ClearButton onClick={clearCategories}>Clear All Categories</ClearButton>
        )}
      </InfoPanel>
      
      <h2>Categories</h2>
      <Categories>
        {categories.map(category => (
          <CategoryButton 
            key={category}
            active={selectedCategories.includes(category)}
            onClick={() => toggleCategory(category)}
          >
            {category}
          </CategoryButton>
        ))}
      </Categories>
      
      <h2>Matching Books ({filteredBooks.length})</h2>
      
      {loading ? (
        <LoadingMessage>Loading books...</LoadingMessage>
      ) : filteredBooks.length === 0 ? (
        <p>No books found matching the selected categories.</p>
      ) : (
        filteredBooks.map(book => (
          <BookCard key={book.id}>
            <BookCover>
              <img 
                src={book.cover_url || 'https://via.placeholder.com/100x150?text=No+Cover'} 
                alt={book.title} 
              />
            </BookCover>
            <BookInfo>
              <BookTitle>{book.title}</BookTitle>
              <BookAuthor>by {book.author}</BookAuthor>
              
              {book.genre && <p><strong>Genre:</strong> {book.genre}</p>}
              
              <BookCategories>
                {Array.isArray(book.categories) && book.categories.map((cat: string, index: number) => (
                  <CategoryTag key={index}>{cat}</CategoryTag>
                ))}
              </BookCategories>
            </BookInfo>
          </BookCard>
        ))
      )}
    </Container>
  );
};

export default TestCategoryPage;
