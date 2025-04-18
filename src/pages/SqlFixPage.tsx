import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import styled from 'styled-components';
import theme from '../styles/theme';

const Container = styled.div`
  padding: 20px;
  max-width: 1000px;
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

const Button = styled.button`
  background-color: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  margin-right: 10px;
  
  &:hover {
    background-color: ${theme.colors.primaryDark};
  }
`;

const SuccessBox = styled.div`
  padding: 15px;
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
  margin-top: 20px;
`;

const ErrorBox = styled.div`
  padding: 15px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  margin-top: 20px;
`;

const SqlFixPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const checkSchema = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // Get a sample book to check the schema
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .limit(1);
        
      if (error) throw error;
      if (!data || data.length === 0) {
        setMessage('No books found in database.');
        setLoading(false);
        return;
      }
      
      const sampleBook = data[0];
      const hasLowercaseFictionType = 'fictiontype' in sampleBook;
      const hasCamelCaseFictionType = 'fictionType' in sampleBook;
      
      let resultMessage = 'Database schema check:\n';
      resultMessage += `- Column 'fictionType' (camelCase): ${hasCamelCaseFictionType ? 'EXISTS' : 'MISSING'}\n`;
      resultMessage += `- Column 'fictiontype' (lowercase): ${hasLowercaseFictionType ? 'EXISTS' : 'NOT FOUND'}\n\n`;
      
      // Add sample book data
      resultMessage += 'Sample book data:\n';
      for (const [key, value] of Object.entries(sampleBook)) {
        if (typeof value !== 'object') {
          resultMessage += `- ${key}: ${value}\n`;
        } else if (value !== null) {
          resultMessage += `- ${key}: ${JSON.stringify(value)}\n`;
        } else {
          resultMessage += `- ${key}: null\n`;
        }
      }
      
      setMessage(resultMessage);
      
    } catch (err) {
      console.error('Error checking schema:', err);
      setError(`Error checking schema: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const fixFictionValues = async () => {
    if (!confirm('This will update the "fictionType" values in your database based on book types. Continue?')) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // First, we need to get all books
      const { data: allBooks, error: fetchError } = await supabase
        .from('books')
        .select('id, type');
      
      if (fetchError) throw fetchError;
      
      if (!allBooks || allBooks.length === 0) {
        setMessage('No books found to update.');
        setLoading(false);
        return;
      }
      
      // Group books by type
      const ebookIds = allBooks.filter(book => book.type === 'ebook').map(book => book.id);
      const audiobookIds = allBooks.filter(book => book.type === 'audiobook').map(book => book.id);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Update ebooks to Fiction
      if (ebookIds.length > 0) {
        // We need to update in batches if there are many books
        const batchSize = 10;
        
        for (let i = 0; i < ebookIds.length; i += batchSize) {
          const batchIds = ebookIds.slice(i, i + batchSize);
          
          try {
            const { error } = await supabase
              .from('books')
              .update({ fictionType: 'Fiction' })
              .in('id', batchIds);
            
            if (error) throw error;
            successCount += batchIds.length;
          } catch (err) {
            console.error('Error updating ebooks batch:', err);
            errorCount += batchIds.length;
          }
        }
      }
      
      // Update audiobooks to Non-Fiction
      if (audiobookIds.length > 0) {
        // We need to update in batches if there are many books
        const batchSize = 10;
        
        for (let i = 0; i < audiobookIds.length; i += batchSize) {
          const batchIds = audiobookIds.slice(i, i + batchSize);
          
          try {
            const { error } = await supabase
              .from('books')
              .update({ fictionType: 'Non-Fiction' })
              .in('id', batchIds);
            
            if (error) throw error;
            successCount += batchIds.length;
          } catch (err) {
            console.error('Error updating audiobooks batch:', err);
            errorCount += batchIds.length;
          }
        }
      }
      
      setMessage(`Successfully updated ${successCount} books: ${ebookIds.length} e-books set to Fiction and ${audiobookIds.length} audiobooks set to Non-Fiction. ${errorCount} errors encountered.`);
      
    } catch (err) {
      console.error('Error updating fiction types:', err);
      setError(`Error updating fiction types: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container>
      <Title>Database Fix Page</Title>
      
      <Section>
        <h2>Fix Database Schema</h2>
        <p>
          Your database may have two fiction type columns:
          <ul>
            <li><strong>fictionType</strong> (camelCase) - This is the correct column with values</li>
            <li><strong>fictiontype</strong> (lowercase) - This might be a duplicate column</li>
          </ul>
          First, check your database schema to see what columns exist.
        </p>
        
        <Button onClick={checkSchema} disabled={loading}>
          {loading ? 'Checking...' : 'Check Database Schema'}
        </Button>
        
        <Button onClick={fixFictionValues} disabled={loading} style={{ backgroundColor: '#52c41a' }}>
          {loading ? 'Processing...' : 'Fix Fiction Type Values'}
        </Button>
        
        {message && <SuccessBox>{message}</SuccessBox>}
        {error && <ErrorBox>{error}</ErrorBox>}
      </Section>
      
      <Section>
        <h2>After Fixing</h2>
        <p>
          After fixing your database:
          <ol>
            <li>Run the "Fix Fiction Type Values" button to ensure your books have proper fiction types</li>
            <li>Go to the <a href="/database-debug" style={{ color: theme.colors.primary }}>Database Debug Page</a> to verify the changes</li>
            <li>Return to the Search page and verify that filtering now works correctly</li>
            <li>If you encounter issues with duplicate columns, you may need to contact Supabase support to remove them through a database migration</li>
          </ol>
        </p>
      </Section>
    </Container>
  );
};

export default SqlFixPage;
