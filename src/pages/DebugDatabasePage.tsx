import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import styled from 'styled-components';
import theme from '../styles/theme';

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  margin-bottom: 20px;
  color: ${theme.colors.primary};
`;

const Section = styled.div`
  margin-bottom: 30px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const SectionTitle = styled.h2`
  margin-bottom: 15px;
  color: ${theme.colors.primary};
  font-size: 1.4rem;
`;

const Button = styled.button`
  background-color: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  margin-right: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  
  &:hover {
    background-color: ${theme.colors.primaryDark};
  }
`;

const InfoBox = styled.div`
  padding: 15px;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  margin-bottom: 20px;
  white-space: pre-wrap;
`;

const ErrorBox = styled.div`
  padding: 15px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  margin-bottom: 20px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  th {
    background-color: #f2f2f2;
    position: sticky;
    top: 0;
  }
  
  tr:nth-child(even) {
    background-color: #f9f9f9;
  }
`;

const ScrollableTable = styled.div`
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
`;

const TableControls = styled.div`
  margin-bottom: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

// Only admins can access this page in production
import { useAuth } from '../context/AuthContext'; // Adjust path as needed
import { useNavigate } from 'react-router-dom';

// Only admins can access this page in production
const DebugDatabasePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth(); // Use isAdmin from context
  useEffect(() => {
    // Use isAdmin instead of user.is_admin for admin check
    if (process.env.NODE_ENV === 'production' && (!user || !isAdmin)) {
      navigate('/'); // Redirect to home if not admin
    }
  }, [user, isAdmin, navigate]);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  
  const fetchAllBooks = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*');
      
      if (error) throw error;
      
      setBooks(data || []);
      setMessage(`Retrieved ${data?.length || 0} books successfully.`);
      
      // Count fiction types
      const typeStats = {
        ebook: 0,
        audiobook: 0,
        other: 0
      };
      
      const fictionStats = {
        'Fiction': 0,
        'Non-Fiction': 0,
        undefined: 0,
        other: 0
      };
      
      // Analyze books
      data?.forEach(book => {
        // Count book types
        if (book.type === 'ebook') typeStats.ebook++;
        else if (book.type === 'audiobook') typeStats.audiobook++;
        else typeStats.other++;
        
        // Count fiction types
        if (!book.fictionType) fictionStats.undefined++;
        else if (book.fictionType === 'Fiction') fictionStats['Fiction']++;
        else if (book.fictionType === 'Non-Fiction') fictionStats['Non-Fiction']++;
        else fictionStats.other++;
      });
      
      setMessage(prev => `${prev}
Book Type Statistics:
- E-books: ${typeStats.ebook}
- Audiobooks: ${typeStats.audiobook}
- Other types: ${typeStats.other}

Fiction Type Statistics:
- Fiction: ${fictionStats['Fiction']}
- Non-Fiction: ${fictionStats['Non-Fiction']}
- Undefined: ${fictionStats.undefined}
- Other values: ${fictionStats.other}`);
      
    } catch (err) {
      console.error('Error fetching books:', err);
      setError(`Error fetching books: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const inspectTableStructure = async () => {
    setLoading(true);
    setTableInfo(null);
    setMessage('');
    setError('');
    
    try {
      // First get a sample book to examine structure
      const { data: sampleBook, error: sampleError } = await supabase
        .from('books')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleError) throw sampleError;
      
      if (!sampleBook) {
        setMessage('No books found in database.');
        return;
      }
      
      // Examine the structure
      const columns = Object.keys(sampleBook);
      const columnInfo = columns.map(col => ({
        name: col,
        type: typeof sampleBook[col],
        value: sampleBook[col],
        hasValue: sampleBook[col] !== null && sampleBook[col] !== undefined
      }));
      
      setTableInfo({
        columnCount: columns.length,
        columns: columnInfo,
        sampleBook
      });
      
      setMessage(`Found ${columns.length} columns in the books table.`);
      
    } catch (err) {
      console.error('Error inspecting table:', err);
      setError(`Error inspecting table: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const testFilterCombinations = async () => {
    setLoading(true);
    setTestResult(null);
    setMessage('');
    setError('');
    
    try {
      const results = [];
      
      // Test 1: Get all books
      const { data: allBooks, error: allError } = await supabase
        .from('books')
        .select('*');
      
      if (allError) throw allError;
      
      results.push({
        test: 'All Books',
        count: allBooks?.length || 0,
        sample: allBooks?.slice(0, 2) || []
      });
      
      // Test 2: E-books only
      const { data: ebooks, error: ebooksError } = await supabase
        .from('books')
        .select('*')
        .eq('type', 'ebook');
      
      if (ebooksError) throw ebooksError;
      
      results.push({
        test: 'E-books Only (type=ebook)',
        count: ebooks?.length || 0,
        sample: ebooks?.slice(0, 2) || []
      });
      
      // Test 3: Fiction only
      const { data: fiction, error: fictionError } = await supabase
        .from('books')
        .select('*')
        .eq('fictionType', 'Fiction');
      
      if (fictionError) throw fictionError;
      
      results.push({
        test: 'Fiction Only (fictionType=Fiction)',
        count: fiction?.length || 0,
        sample: fiction?.slice(0, 2) || []
      });
      
      // Test 4: E-books + Fiction
      const { data: ebooksFiction, error: ebooksFictionError } = await supabase
        .from('books')
        .select('*')
        .eq('type', 'ebook')
        .eq('fictionType', 'Fiction');
      
      if (ebooksFictionError) throw ebooksFictionError;
      
      results.push({
        test: 'E-books + Fiction',
        count: ebooksFiction?.length || 0,
        sample: ebooksFiction?.slice(0, 2) || []
      });
      
      // Test 5: Try with lowercase fiction
      const { data: lowercaseFiction, error: lowercaseError } = await supabase
        .from('books')
        .select('*')
        .eq('fictionType', 'fiction');
      
      if (lowercaseError) throw lowercaseError;
      
      results.push({
        test: 'Lowercase "fiction"',
        count: lowercaseFiction?.length || 0,
        sample: lowercaseFiction?.slice(0, 2) || []
      });
      
      // Test 6: Try with fiction_type column name
      const { data: fictionTypeCol, error: fictionTypeColError } = await supabase
        .from('books')
        .select('*')
        .eq('fiction_type', 'Fiction');
      
      if (fictionTypeColError && !fictionTypeColError.message.includes('column')) {
        throw fictionTypeColError;
      }
      
      results.push({
        test: 'Using fiction_type column',
        count: fictionTypeCol?.length || 0,
        error: fictionTypeColError ? fictionTypeColError.message : null,
        sample: fictionTypeCol?.slice(0, 2) || []
      });
      
      // Set results
      setTestResult(results);
      setMessage('Completed all filter tests successfully.');
      
    } catch (err) {
      console.error('Error running filter tests:', err);
      setError(`Error running filter tests: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const updateAllBooksWithFictionType = async (fictionType: 'Fiction' | 'Non-Fiction') => {
    if (!confirm(`Are you sure you want to set ALL books to have fictionType "${fictionType}"?`)) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // Since we can't update all at once, get all book IDs first
      const { data: bookIds, error: idsError } = await supabase
        .from('books')
        .select('id');
      
      if (idsError) throw idsError;
      
      if (!bookIds || bookIds.length === 0) {
        setMessage('No books found to update.');
        return;
      }
      
      setMessage(`Starting to update ${bookIds.length} books...`);
      
      // Update in batches
      const batchSize = 20;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < bookIds.length; i += batchSize) {
        const batch = bookIds.slice(i, i + batchSize);
        const batchIds = batch.map(book => book.id);
        
        try {
          const { error: updateError } = await supabase
            .from('books')
            .update({ fictionType })
            .in('id', batchIds);
          
          if (updateError) throw updateError;
          
          successCount += batch.length;
          setMessage(`Updated ${successCount}/${bookIds.length} books...`);
          
        } catch (err) {
          console.error(`Error updating batch ${i}:`, err);
          errorCount += batch.length;
        }
      }
      
      setMessage(`Update complete. Successfully updated ${successCount} books, encountered errors with ${errorCount} books.`);
      
      // Refresh books
      fetchAllBooks();
      
    } catch (err) {
      console.error('Error updating books:', err);
      setError(`Error updating books: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const splitBooksByType = async () => {
    if (!confirm('This will split your books by type - setting all e-books to Fiction and all audiobooks to Non-Fiction. Continue?')) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // First update all e-books to Fiction
      const { error: ebooksError } = await supabase
        .from('books')
        .update({ fictionType: 'Fiction' })
        .eq('type', 'ebook');
      
      if (ebooksError) throw ebooksError;
      
      // Then update all audiobooks to Non-Fiction
      const { error: audiobooksError } = await supabase
        .from('books')
        .update({ fictionType: 'Non-Fiction' })
        .eq('type', 'audiobook');
      
      if (audiobooksError) throw audiobooksError;
      
      setMessage('Successfully split books: set all e-books to Fiction and all audiobooks to Non-Fiction');
      
      // Refresh books
      fetchAllBooks();
      
    } catch (err) {
      console.error('Error splitting books:', err);
      setError(`Error splitting books: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container>
      <Title>Database Debug Page</Title>
      
      <Section>
        <SectionTitle>Actions</SectionTitle>
        <Button onClick={fetchAllBooks} disabled={loading}>
          Fetch All Books
        </Button>
        <Button onClick={inspectTableStructure} disabled={loading}>
          Inspect Table Structure
        </Button>
        <Button onClick={testFilterCombinations} disabled={loading}>
          Test Filter Combinations
        </Button>
        <Button 
          onClick={() => updateAllBooksWithFictionType('Fiction')} 
          disabled={loading}
          style={{ backgroundColor: '#52c41a' }}
        >
          Set ALL to Fiction
        </Button>
        <Button 
          onClick={() => updateAllBooksWithFictionType('Non-Fiction')} 
          disabled={loading}
          style={{ backgroundColor: '#faad14' }}
        >
          Set ALL to Non-Fiction
        </Button>
        <Button 
          onClick={splitBooksByType} 
          disabled={loading}
          style={{ backgroundColor: '#1890ff' }}
        >
          Split by Type (E-books=Fiction, Audiobooks=Non-Fiction)
        </Button>
      </Section>
      
      {loading && (
        <Section>
          <div>Loading... Please wait.</div>
        </Section>
      )}
      
      {message && (
        <Section>
          <SectionTitle>Results</SectionTitle>
          <InfoBox>{message}</InfoBox>
        </Section>
      )}
      
      {error && (
        <Section>
          <SectionTitle>Error</SectionTitle>
          <ErrorBox>{error}</ErrorBox>
        </Section>
      )}
      
      {tableInfo && (
        <Section>
          <SectionTitle>Table Structure</SectionTitle>
          <InfoBox>
            <div>Found {tableInfo.columnCount} columns in the books table.</div>
            <div>Columns: {tableInfo.columns.map((col: any) => col.name).join(', ')}</div>
          </InfoBox>
          
          <h3>Column Details</h3>
          <ScrollableTable>
            <Table>
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Type</th>
                  <th>Has Value</th>
                  <th>Sample Value</th>
                </tr>
              </thead>
              <tbody>
                {tableInfo.columns.map((col: any) => (
                  <tr key={col.name}>
                    <td>{col.name}</td>
                    <td>{col.type}</td>
                    <td>{col.hasValue ? 'Yes' : 'No'}</td>
                    <td>{col.value !== null && typeof col.value !== 'object' 
                      ? String(col.value).substring(0, 50) 
                      : JSON.stringify(col.value).substring(0, 50)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollableTable>
          
          <h3>Sample Book (Full JSON)</h3>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {JSON.stringify(tableInfo.sampleBook, null, 2)}
          </pre>
        </Section>
      )}
      
      {testResult && (
        <Section>
          <SectionTitle>Filter Test Results</SectionTitle>
          
          {testResult.map((result: any, index: number) => (
            <div key={index} style={{ marginBottom: '20px' }}>
              <h3>{result.test}</h3>
              <div>Results: {result.count} books</div>
              {result.error && <div style={{ color: 'red' }}>Error: {result.error}</div>}
              
              {result.sample.length > 0 && (
                <>
                  <h4>Sample Books:</h4>
                  <ScrollableTable>
                    <Table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Fiction Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.sample.map((book: any) => (
                          <tr key={book.id}>
                            <td>{book.id}</td>
                            <td>{book.title}</td>
                            <td>{book.type}</td>
                            <td>{book.fictionType || '(not set)'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </ScrollableTable>
                </>
              )}
            </div>
          ))}
        </Section>
      )}
      
      {books.length > 0 && (
        <Section>
          <SectionTitle>All Books ({books.length})</SectionTitle>
          
          <TableControls>
            <Button onClick={() => alert('Type Counts: ' + 
              books.reduce((acc: any, book) => {
                acc[book.type] = (acc[book.type] || 0) + 1;
                return acc;
              }, {}))}>
              Count by Type
            </Button>
            
            <Button onClick={() => alert('Fiction Type Counts: ' + 
              books.reduce((acc: any, book) => {
                const type = book.fictionType || 'undefined';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
              }, {}))}>
              Count by Fiction Type
            </Button>
          </TableControls>
          
          <ScrollableTable>
            <Table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Fiction Type</th>
                  <th>Author</th>
                </tr>
              </thead>
              <tbody>
                {books.map(book => (
                  <tr key={book.id}>
                    <td>{book.id.substring(0, 8)}...</td>
                    <td>{book.title}</td>
                    <td>{book.type}</td>
                    <td style={{
                      backgroundColor: !book.fictionType 
                        ? '#ffccc7' 
                        : book.fictionType === 'Fiction' 
                          ? '#d9f7be' 
                          : '#b5f5ec'
                    }}>
                      {book.fictionType || '(not set)'}
                    </td>
                    <td>{book.author}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollableTable>
        </Section>
      )}
    </Container>
  );
};

export default DebugDatabasePage;
