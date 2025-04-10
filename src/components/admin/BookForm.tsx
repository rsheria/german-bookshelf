import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiSave, FiX, FiUpload, FiAlertCircle, FiSearch, FiLoader } from 'react-icons/fi';
import { supabase } from '../../services/supabase';
import { Book } from '../../types/supabase';
import { fetchBookDataFromAmazon, isValidAmazonUrl } from '../../services/amazonScraperService';
import { fetchBookDataFromLehmanns, isValidLehmannsUrl } from '../../services/lehmannsScraperService';

interface BookFormProps {
  book?: Book;
  isEdit?: boolean;
}

const FormContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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

const Textarea = styled.textarea`
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  min-height: 150px;
  resize: vertical;

  &:focus {
    border-color: #3498db;
  }
`;

const Select = styled.select`
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  background-color: white;

  &:focus {
    border-color: #3498db;
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
`;

const SaveButton = styled(Button)`
  background-color: #3498db;
  color: white;
  border: none;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: white;
  color: #333;
  border: 1px solid #ddd;

  &:hover {
    background-color: #f5f5f5;
  }
`;

const CoverPreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

const FileInput = styled.input`
  display: none;
`;

const UploadButton = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  width: fit-content;

  &:hover {
    background-color: #e0e0e0;
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

const BookLinkContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border: 1px dashed #3498db;
  padding: 1rem;
  border-radius: 4px;
  background-color: #f8f9fa;
`;

const SourceTabs = styled.div`
  display: flex;
  margin-bottom: 1rem;
`;

const SourceTab = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  background-color: ${props => props.active ? '#3498db' : '#f1f1f1'};
  color: ${props => props.active ? 'white' : '#333'};
  border: 1px solid #ddd;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.active ? '#2980b9' : '#e9e9e9'};
  }
  
  &:first-child {
    margin-right: 0.5rem;
  }
`;

const InputRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const FetchButton = styled(Button)`
  background-color: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1rem;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const BookForm: React.FC<BookFormProps> = ({ book, isEdit = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState(book?.title || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [genre, setGenre] = useState(book?.genre || '');
  const [language, setLanguage] = useState(book?.language || 'German');
  const [description, setDescription] = useState(book?.description || '');
  const [type, setType] = useState(book?.type || 'audiobook');
  const [downloadUrl, setDownloadUrl] = useState(book?.download_url || '');
  const [isbn, setIsbn] = useState(book?.isbn || '');
  const [externalId, setExternalId] = useState(book?.external_id || '');
  const [publishedDate, setPublishedDate] = useState(book?.published_date || '');
  const [publisher, setPublisher] = useState(book?.publisher || '');
  const [pageCount, setPageCount] = useState(book?.page_count?.toString() || '');
  
  const [coverUrl, setCoverUrl] = useState(book?.cover_url || '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New states for book data extraction
  const [sourceType, setSourceType] = useState<'amazon' | 'lehmanns'>('amazon');
  const [bookUrl, setBookUrl] = useState('');
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [dataExtractionError, setDataExtractionError] = useState<string | null>(null);
  const [dataExtractionSuccess, setDataExtractionSuccess] = useState<string | null>(null);

  // Function to extract data from URL
  const extractBookData = async () => {
    if (!bookUrl) {
      setDataExtractionError(t('admin.urlEmpty', 'Please enter a book URL'));
      return;
    }

    // Validate URL based on source type
    if (sourceType === 'amazon' && !isValidAmazonUrl(bookUrl)) {
      setDataExtractionError(t('admin.invalidUrl', 'Invalid Amazon URL. Please use a valid Amazon book URL'));
      return;
    } else if (sourceType === 'lehmanns' && !isValidLehmannsUrl(bookUrl)) {
      setDataExtractionError(t('admin.invalidUrl', 'Invalid Lehmanns URL. Please use a valid Lehmanns book URL'));
      return;
    }

    setIsExtractingData(true);
    setDataExtractionError(null);
    setDataExtractionSuccess(null);

    try {
      if (sourceType === 'amazon') {
        const amazonData = await fetchBookDataFromAmazon(bookUrl);
        
        if (!amazonData) {
          throw new Error(t('admin.failedToExtractData', 'Failed to extract data from the provided URL'));
        }

        // Set the data from Amazon
        setTitle(amazonData.title);
        setAuthor(amazonData.author);
        setGenre(amazonData.genre);
        setLanguage(amazonData.language);
        setDescription(amazonData.description);
        setType(amazonData.type);
        setCoverUrl(amazonData.coverUrl);
        setIsbn(amazonData.isbn);
        setExternalId(amazonData.asin);
        
        if (amazonData.pageCount) {
          setPageCount(amazonData.pageCount.toString());
        }
        
        if (amazonData.publishedDate) {
          setPublishedDate(amazonData.publishedDate);
        }
        
        if (amazonData.publisher) {
          setPublisher(amazonData.publisher);
        }
      } else if (sourceType === 'lehmanns') {
        const lehmannsData = await fetchBookDataFromLehmanns(bookUrl);
        
        if (!lehmannsData) {
          throw new Error(t('admin.failedToExtractData', 'Failed to extract data from the provided URL'));
        }

        // Set the data from Lehmanns
        setTitle(lehmannsData.title);
        setAuthor(lehmannsData.author);
        setGenre(lehmannsData.genre);
        setLanguage(lehmannsData.language);
        setDescription(lehmannsData.description);
        setType(lehmannsData.type);
        setCoverUrl(lehmannsData.coverUrl);
        setIsbn(lehmannsData.isbn);
        setExternalId(lehmannsData.external_id);
        
        if (lehmannsData.pageCount) {
          setPageCount(lehmannsData.pageCount.toString());
        }
        
        if (lehmannsData.publishedDate) {
          setPublishedDate(lehmannsData.publishedDate);
        }
        
        if (lehmannsData.publisher) {
          setPublisher(lehmannsData.publisher);
        }
      }

      setDataExtractionSuccess(t('admin.dataExtracted', 'Book data successfully extracted'));
    } catch (err) {
      console.error('Error extracting data:', err);
      setDataExtractionError(
        err instanceof Error 
          ? err.message 
          : t('admin.unknownError', 'An unknown error occurred')
      );
    } finally {
      setIsExtractingData(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const uploadCover = async () => {
    if (!coverFile) {
      throw new Error('No cover file to upload');
    }
    
    // Generate a unique file name
    const fileExt = coverFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `covers/${fileName}`;
    
    // Upload to Supabase Storage
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    
    const { error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(filePath, coverFile);
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get the public URL
    const { data } = supabase.storage
      .from('book-covers')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate form
      if (!title || !author || !genre || !language || !description || !type || !downloadUrl) {
        throw new Error(t('admin.formValidationError'));
      }
      
      // Upload cover if there's a new file
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        finalCoverUrl = await uploadCover();
      }
      
      if (isEdit && book) {
        // Update existing book
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }
        
        const { error: updateError } = await supabase
          .from('books')
          .update({
            title,
            author,
            genre,
            language,
            description,
            type,
            download_url: downloadUrl,
            cover_url: finalCoverUrl,
            isbn,
            external_id: externalId,
            published_date: publishedDate,
            publisher,
            page_count: pageCount ? parseInt(pageCount) : null
          })
          .eq('id', book.id);
        
        if (updateError) {
          throw updateError;
        }
        
        navigate('/admin/books');
      } else {
        // Create new book
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }
        
        const { error: insertError } = await supabase
          .from('books')
          .insert({
            title,
            author,
            genre,
            language,
            description,
            type,
            download_url: downloadUrl,
            cover_url: finalCoverUrl,
            isbn,
            external_id: externalId,
            published_date: publishedDate,
            publisher,
            page_count: pageCount ? parseInt(pageCount) : null
          });
        
        if (insertError) {
          throw insertError;
        }
        
        navigate('/admin/books');
      }
    } catch (err) {
      console.error('Error saving book:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <FormContainer>
      {error && (
        <Alert>
          <FiAlertCircle /> {error}
        </Alert>
      )}
      
      {success && (
        <AlertSuccess>
          <FiAlertCircle /> {success}
        </AlertSuccess>
      )}

      {/* Book URL input with source selection */}
      <BookLinkContainer>
        <SourceTabs>
          <SourceTab 
            active={sourceType === 'amazon'} 
            onClick={() => setSourceType('amazon')}
          >
            Amazon
          </SourceTab>
          <SourceTab 
            active={sourceType === 'lehmanns'} 
            onClick={() => setSourceType('lehmanns')}
          >
            Lehmanns.de
          </SourceTab>
        </SourceTabs>
        
        <InputRow>
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="bookUrl">
              {sourceType === 'amazon' 
                ? t('admin.amazonUrlInput', 'Amazon Book URL') 
                : t('admin.lehmannsUrlInput', 'Lehmanns Book URL')}
            </Label>
            <Input
              id="bookUrl"
              type="url"
              value={bookUrl}
              onChange={(e) => setBookUrl(e.target.value)}
              placeholder={sourceType === 'amazon' 
                ? "https://www.amazon.de/dp/ASIN" 
                : "https://www.lehmanns.de/buch/ISBN"
              }
            />
            {dataExtractionError && <span style={{ color: '#721c24', fontSize: '0.85rem' }}>{dataExtractionError}</span>}
            {dataExtractionSuccess && <span style={{ color: '#155724', fontSize: '0.85rem' }}>{dataExtractionSuccess}</span>}
          </FormGroup>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
            <FetchButton 
              type="button" 
              onClick={extractBookData}
              disabled={isExtractingData || !bookUrl}
            >
              {isExtractingData ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiSearch />} 
              {t('admin.extractData', 'Extract Data')}
            </FetchButton>
          </div>
        </InputRow>
      </BookLinkContainer>
      
      <Form onSubmit={handleSubmit}>
        <FormRow>
          <FormGroup>
            <Label htmlFor="title">{t('books.title')} *</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="author">{t('books.author')} *</Label>
            <Input
              id="author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
            />
          </FormGroup>
        </FormRow>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="genre">{t('books.genre')} *</Label>
            <Select
              id="genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              required
            >
              <option value="">{t('admin.selectGenre')}</option>
              <option value="Fiction">Fiction</option>
              <option value="Non-Fiction">Non-Fiction</option>
              <option value="Science Fiction">Science Fiction</option>
              <option value="Fantasy">Fantasy</option>
              <option value="Mystery">Mystery</option>
              <option value="Thriller">Thriller</option>
              <option value="Romance">Romance</option>
              <option value="Biography">Biography</option>
              <option value="History">History</option>
              <option value="Self-Help">Self-Help</option>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="language">{t('books.language')} *</Label>
            <Select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
            >
              <option value="German">German</option>
              <option value="German-English">German-English</option>
              <option value="English">English</option>
            </Select>
          </FormGroup>
        </FormRow>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="type">{t('books.type')} *</Label>
            <Select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              required
            >
              <option value="audiobook">{t('books.audiobook')}</option>
              <option value="ebook">{t('books.ebook')}</option>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="downloadUrl">{t('admin.externalUrl')} *</Label>
            <Input
              id="downloadUrl"
              type="url"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://example.com/download/book.pdf"
              required
            />
          </FormGroup>
        </FormRow>

        {/* Additional book metadata row */}
        <FormRow>
          <FormGroup>
            <Label htmlFor="isbn">{t('books.isbn', 'ISBN')}</Label>
            <Input
              id="isbn"
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="9783123456789"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="externalId">{t('books.externalId', 'ASIN/External ID')}</Label>
            <Input
              id="externalId"
              type="text"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="B07ABC123D"
            />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup>
            <Label htmlFor="publisher">{t('books.publisher', 'Publisher')}</Label>
            <Input
              id="publisher"
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Verlag XYZ"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="publishedDate">{t('books.publishedDate', 'Published Date')}</Label>
            <Input
              id="publishedDate"
              type="text"
              value={publishedDate}
              onChange={(e) => setPublishedDate(e.target.value)}
              placeholder="1. Januar 2023"
            />
          </FormGroup>
        </FormRow>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="description">{t('books.description')} *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </FormGroup>
          
          <CoverPreviewContainer>
            <Label>{t('admin.coverImage')}</Label>
            <CoverPreview>
              <CoverImage 
                src={coverUrl || 'https://via.placeholder.com/150x225?text=No+Cover'} 
                alt={t('admin.coverPreview')}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/150x225?text=No+Cover';
                }}
              />
            </CoverPreview>
            
            <FileInput
              id="coverFile"
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
            />
            <UploadButton htmlFor="coverFile">
              <FiUpload /> {t('admin.uploadCover')}
            </UploadButton>
          </CoverPreviewContainer>
        </FormRow>
        
        <ButtonsContainer>
          <CancelButton type="button" onClick={() => navigate('/admin/books')}>
            <FiX /> {t('common.cancel')}
          </CancelButton>
          
          <SaveButton type="submit" disabled={isLoading}>
            <FiSave /> {isLoading ? t('common.saving') : t('common.save')}
          </SaveButton>
        </ButtonsContainer>
      </Form>
    </FormContainer>
  );
};

export default BookForm;
