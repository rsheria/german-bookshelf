import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import styled from 'styled-components';
import theme from '../styles/theme';

const Container = styled.div`
  padding: 20px;
`;

const Title = styled.h1`
  margin-bottom: 20px;
`;

const BookTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
  }
  
  th {
    background-color: ${theme.colors.backgroundAlt};
    position: sticky;
    top: 0;
  }
  
  tr:nth-child(even) {
    background-color: #f9f9f9;
  }
  
  tr:hover {
    background-color: #f1f1f1;
  }
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  margin: 0 8px 8px 0;
  border: none;
  border-radius: 4px;
  background-color: ${theme.colors.primary};
  color: white;
  cursor: pointer;
  
  &:hover {
    background-color: ${theme.colors.primaryDark};
  }
`;

// Only admins can access this page in production
import { useAuth } from '../context/AuthContext'; // Adjust path as needed
import { useNavigate } from 'react-router-dom';

// Only admins can access this page in production
const BookDebugPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth(); // Use isAdmin from context
  useEffect(() => {
    // Use isAdmin instead of user.is_admin for admin check
    if (process.env.NODE_ENV === 'production' && (!user || !isAdmin)) {
      navigate('/'); // Redirect to home if not admin
    }
  }, [user, isAdmin, navigate]);
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    fetchAllBooks();
  }, []);
  
  const fetchAllBooks = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*');
      
      if (error) throw error;
      
      setBooks(data || []);
      console.log('All books:', data);
      
      // Count books by type
      const ebookCount = data?.filter(book => book.type === 'ebook').length || 0;
      const audiobookCount = data?.filter(book => book.type === 'audiobook').length || 0;
      
      // Count books by fiction type
      const fictionCount = data?.filter(book => book.fictionType === 'Fiction').length || 0;
      const nonFictionCount = data?.filter(book => book.fictionType === 'Non-Fiction').length || 0;
      const missingFictionType = data?.filter(book => !book.fictionType).length || 0;
      
      setMessage(`Found ${data?.length} total books:
        - E-books: ${ebookCount}
        - Audiobooks: ${audiobookCount}
        - Fiction: ${fictionCount}
        - Non-Fiction: ${nonFictionCount}
        - Missing fictionType: ${missingFictionType}
      `);
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateAllMissingToFiction = async () => {
    const booksToUpdate = books.filter(book => !book.fictionType);
    
    try {
      setMessage('Updating books without fictionType to Fiction...');
      
      for (const book of booksToUpdate) {
        const { error } = await supabase
          .from('books')
          .update({ fictionType: 'Fiction' })
          .eq('id', book.id);
        
        if (error) throw error;
      }
      
      setMessage(`Updated ${booksToUpdate.length} books to have fictionType = 'Fiction'`);
      fetchAllBooks();
    } catch (err) {
      console.error('Error updating books:', err);
      setMessage(`Error updating books: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  const setBookAsFiction = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({ fictionType: 'Fiction' })
        .eq('id', bookId);
      
      if (error) throw error;
      
      setMessage(`Updated book ${bookId} to Fiction`);
      fetchAllBooks();
    } catch (err) {
      console.error('Error updating book:', err);
      setMessage(`Error updating book: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  const setBookAsNonFiction = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({ fictionType: 'Non-Fiction' })
        .eq('id', bookId);
      
      if (error) throw error;
      
      setMessage(`Updated book ${bookId} to Non-Fiction`);
      fetchAllBooks();
    } catch (err) {
      console.error('Error updating book:', err);
      setMessage(`Error updating book: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  return (
    <Container>
      <Title>Book Database Debug</Title>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          margin: '10px 0', 
          backgroundColor: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: '4px',
          whiteSpace: 'pre-line'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <ActionButton onClick={fetchAllBooks}>
          Refresh Books
        </ActionButton>
        <ActionButton onClick={updateAllMissingToFiction}>
          Set All Missing to Fiction
        </ActionButton>
        <ActionButton onClick={() => window.location.href = '/search'}>
          Go to Search Page
        </ActionButton>
      </div>
      
      {isLoading ? (
        <p>Loading books...</p>
      ) : (
        <BookTable>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Type</th>
              <th>Fiction Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map(book => (
              <tr key={book.id}>
                <td>{book.id}</td>
                <td>{book.title}</td>
                <td>{book.type}</td>
                <td>{book.fictionType || 'Not set'}</td>
                <td>
                  <button 
                    onClick={() => setBookAsFiction(book.id)}
                    style={{
                      padding: '4px 8px',
                      marginRight: '5px',
                      backgroundColor: book.fictionType === 'Fiction' ? '#52c41a' : '#1890ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                  >
                    Set as Fiction
                  </button>
                  <button 
                    onClick={() => setBookAsNonFiction(book.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: book.fictionType === 'Non-Fiction' ? '#52c41a' : '#1890ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                  >
                    Set as Non-Fiction
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </BookTable>
      )}
    </Container>
  );
};

export default BookDebugPage;
