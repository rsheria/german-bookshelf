import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiArrowLeft, FiSearch, FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { fetchBookDataFromThalia, isValidThaliaUrl, thaliaDataToBook } from '../../services/thaliaScraperService';
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

const ThaliaScraperPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  
  const [thaliaUrl, setThaliaUrl] = useState('');
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
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setBookData(null);
    
    try {
      // Validate Thalia URL
      if (!isValidThaliaUrl(thaliaUrl)) {
        throw new Error(t('admin.invalidThaliaUrl', 'Invalid Thalia URL'));
      }
      
      // Fetch book data from Thalia
      const bookData = await fetchBookDataFromThalia(thaliaUrl);
      setBookData(bookData);
      setSuccess(t('admin.bookDataFetched', 'Book data successfully fetched from Thalia'));
    } catch (error: any) {
      console.error('Error fetching book data:', error);
      setError(error.message || t('admin.errorFetchingData', 'An error occurred while fetching book data'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddToLibrary = async () => {
    if (!bookData) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Convert Thalia data to Book model
      const newBook = thaliaDataToBook(bookData);
      
      // Add required fields for insertion
      newBook.created_at = new Date().toISOString();
      
      // Insert book into database
      const { error } = await supabase
        .from('books')
        .insert(newBook as Book)
        .select('id')
        .single();
      
      if (error) throw error;
      
      setSuccess(t('admin.bookAddedToLibrary', 'Book successfully added to your library'));
      setThaliaUrl('');
      setBookData(null);
    } catch (error: any) {
      console.error('Error adding book to library:', error);
      setError(t('admin.errorAddingBook', 'An error occurred while adding the book to the library'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRedirectToForm = () => {
    // Store book data in sessionStorage
    if (bookData) {
      sessionStorage.setItem('thalia_book_data', JSON.stringify(bookData));
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
          <FiSearch style={{ marginRight: '0.5rem' }} /> {t('admin.thaliaBookScraper', 'Thalia Book Scraper')}
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
            <Label htmlFor="thaliaUrl">{t('admin.thaliaBookUrl', 'Thalia Book URL')}</Label>
            <Input
              id="thaliaUrl"
              type="url"
              value={thaliaUrl}
              onChange={(e) => setThaliaUrl(e.target.value)}
              placeholder="https://www.thalia.de/shop/home/artikeldetails/..."
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
                <div><strong>EAN:</strong> {bookData.ean}</div>
              </BookMeta>
              
              <div style={{ marginTop: 'auto' }}>
                <p>{t('admin.thaliaDataFetchedNote', 'The book data has been fetched from Thalia. You can now add it directly to the library or continue to the book form for further editing.')}</p>
                
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

export default ThaliaScraperPage;
