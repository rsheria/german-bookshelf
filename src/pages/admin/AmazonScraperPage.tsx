import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiArrowLeft, FiSearch, FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { fetchBookDataFromAmazon, isValidAmazonUrl, amazonDataToBook } from '../../services/amazonScraperService';
import { supabase } from '../../services/supabase';
import { Book } from '../../types/supabase';
import {
  AdminContainer,
  AdminHeader,
  AdminTitle,
  LoadingState
} from '../../styles/adminStyles';

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  font-size: ${props => props.theme.typography.fontSize.base};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  transition: all 0.2s;
  
  &:hover {
    transform: translateX(-3px);
    color: ${props => props.theme.colors.primaryDark};
  }
`;

const FormContainer = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};
  padding: 2rem;
  margin-top: 1rem;
  max-width: 800px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
`;

const Input = styled.input`
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #3498db;
  }
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryDark};
  }
  
  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const Alert = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
`;

const AlertSuccess = styled(Alert)`
  background-color: #d4edda;
  color: #155724;
`;

const BookPreview = styled.div`
  margin-top: 2rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 1.5rem;
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const CoverPreview = styled.div`
  width: 150px;
  height: 225px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const CoverImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const BookDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const BookTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
`;

const BookMeta = styled.div`
  color: #666;
  font-size: 0.9rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const AmazonScraperPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  
  const [amazonUrl, setAmazonUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bookData, setBookData] = useState<any>(null);
  
  useEffect(() => {
    // Redirect if not admin
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);
  
  const handleFetchBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidAmazonUrl(amazonUrl)) {
      setError(t('admin.invalidAmazonUrl', 'Please enter a valid Amazon URL'));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setBookData(null);
    
    try {
      const data = await fetchBookDataFromAmazon(amazonUrl);
      
      if (!data) {
        setError(t('admin.couldNotFetchBook', 'Could not fetch book data from Amazon'));
        return;
      }
      
      setBookData(data);
      setSuccess(t('admin.bookDataFetched', 'Book data successfully fetched from Amazon'));
    } catch (error) {
      console.error('Error fetching book data:', error);
      setError(t('admin.errorFetchingBook', 'An error occurred while fetching book data'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddToLibrary = async () => {
    if (!bookData) return;
    
    try {
      setIsLoading(true);
      
      // Convert the Amazon data to our book format
      const bookToAdd = amazonDataToBook(bookData);
      
      // Add required fields for the database
      const fullBook: Partial<Book> = {
        ...bookToAdd,
        // Only include fields that exist in the Book type
        download_url: '', // This would need to be filled in by the admin
        created_at: new Date().toISOString(),
      };
      
      // Insert into database
      const { error: insertError } = await supabase
        .from('books')
        .insert([fullBook]);
      
      if (insertError) {
        throw insertError;
      }
      
      setSuccess(t('admin.bookAddedToLibrary', 'Book was successfully added to the library!'));
      
      // Clear form and data after 2 seconds
      setTimeout(() => {
        navigate('/admin/books');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding book to library:', error);
      setError(t('admin.errorAddingBook', 'An error occurred while adding the book to the library'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRedirectToForm = () => {
    // Store book data in sessionStorage
    if (bookData) {
      sessionStorage.setItem('amazon_book_data', JSON.stringify(bookData));
    }
    
    // Navigate to the add book form
    navigate('/admin/books/add');
  };
  
  if (authLoading) {
    return (
      <AdminContainer>
        <LoadingState>{t('common.loading')}</LoadingState>
      </AdminContainer>
    );
  }
  
  if (!user || !isAdmin) {
    return null; // Will redirect to home
  }
  
  return (
    <AdminContainer>
      <BackButton onClick={() => navigate('/admin')}>
        <FiArrowLeft /> {t('common.back')}
      </BackButton>
      
      <AdminHeader>
        <AdminTitle>
          <FiSearch style={{ marginRight: '0.5rem' }} /> {t('admin.amazonScraper', 'Amazon Book Scraper')}
        </AdminTitle>
      </AdminHeader>
      
      <FormContainer>
        {error && (
          <Alert>
            <FiAlertCircle />
            {error}
          </Alert>
        )}
        
        {success && (
          <AlertSuccess>
            <FiCheck />
            {success}
          </AlertSuccess>
        )}
        
        <Form onSubmit={handleFetchBook}>
          <FormGroup>
            <Label htmlFor="amazonUrl">{t('admin.amazonBookUrl', 'Amazon Book URL')}</Label>
            <Input
              id="amazonUrl"
              type="url"
              value={amazonUrl}
              onChange={(e) => setAmazonUrl(e.target.value)}
              placeholder="https://www.amazon.de/dp/B07..."
              required
            />
          </FormGroup>
          
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <FiLoader className="spin" /> {t('common.loading')}
              </>
            ) : (
              <>
                <FiSearch /> {t('admin.fetchBookData', 'Fetch Book Data')}
              </>
            )}
          </Button>
        </Form>
        
        {bookData && (
          <BookPreview>
            <CoverPreview>
              <CoverImage 
                src={bookData.coverUrl || 'https://via.placeholder.com/150x225?text=No+Cover'} 
                alt={bookData.title}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/150x225?text=No+Cover';
                }}
              />
            </CoverPreview>
            
            <BookDetails>
              <BookTitle>{bookData.title}</BookTitle>
              <BookMeta>
                <div><strong>{t('books.type')}:</strong> {bookData.type === 'audiobook' ? t('books.audiobook') : t('books.ebook')}</div>
                <div><strong>{t('books.language')}:</strong> {bookData.language}</div>
                <div><strong>ASIN:</strong> {bookData.asin}</div>
              </BookMeta>
              
              <div style={{ marginTop: 'auto' }}>
                <p>{t('admin.amazonDataFetchedNote', 'The book data has been fetched from Amazon. You can now add it directly to the library or continue to the book form for further editing.')}</p>
                
                <ActionButtons>
                  <Button onClick={handleAddToLibrary} disabled={isLoading}>
                    <FiCheck /> {t('admin.addToLibrary', 'Add to Library')}
                  </Button>
                  
                  <Button 
                    onClick={handleRedirectToForm}
                    style={{ backgroundColor: '#f39c12' }}
                    disabled={isLoading}
                  >
                    <FiSearch /> {t('admin.continueToForm', 'Continue to Form')}
                  </Button>
                </ActionButtons>
              </div>
            </BookDetails>
          </BookPreview>
        )}
      </FormContainer>
    </AdminContainer>
  );
};

export default AmazonScraperPage;
