import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiSave, FiX, FiUpload, FiAlertCircle, FiSearch, FiLoader, FiBookOpen, FiHash } from 'react-icons/fi';
import { supabase } from '../../services/supabase';
import { Book } from '../../types/supabase';
import { fetchBookDataFromThalia, isValidThaliaUrl } from '../../services/thaliaScraperService';
import { fetchBookDataFromLehmanns, isValidLehmannsUrl } from '../../services/lehmannsScraperService';
import { getBookData } from '../../services/bookDataService';

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

const DataSourceToggle = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const DataSourceButton = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  background-color: ${props => props.active ? '#3498db' : '#f5f5f5'};
  color: ${props => props.active ? 'white' : '#333'};
  border: 1px solid ${props => props.active ? '#3498db' : '#ddd'};
  font-size: 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? '#2980b9' : '#e0e0e0'};
  }
`;

const BookForm: React.FC<BookFormProps> = ({ book, isEdit = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
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
  
  const [dataSource, setDataSource] = useState<'url' | 'isbn'>('url');
  const [thaliaUrl, setThaliaUrl] = useState('');
  const [lehmannsUrl, setLehmannsUrl] = useState('');
  const [isbnInput, setIsbnInput] = useState('');
  const [activeTab, setActiveTab] = useState<'thalia' | 'lehmanns'>('thalia');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractSuccess, setExtractSuccess] = useState('');

  const extractBookData = async () => {
    setIsExtracting(true);
    setExtractError('');
    setExtractSuccess('');
    
    try {
      if (dataSource === 'url') {
        if (activeTab === 'thalia') {
          if (!isValidThaliaUrl(thaliaUrl)) {
            throw new Error(t('admin.invalidThaliaUrl', 'Invalid Thalia URL'));
          }
          
          const thaliaData = await fetchBookDataFromThalia(thaliaUrl);
          if (!thaliaData) {
            throw new Error(t('admin.failedToExtract', 'Failed to extract book data'));
          }
          
          setTitle(thaliaData.title);
          setAuthor(thaliaData.author);
          setDescription(thaliaData.description);
          setCoverUrl(thaliaData.coverUrl);
          setLanguage(thaliaData.language || 'german');
          setGenre(thaliaData.genre || '');
          setType(thaliaData.type || 'ebook');
          setIsbn(thaliaData.isbn || '');
          setExternalId(thaliaData.ean || '');
          setPublisher(thaliaData.publisher || '');
          setPublishedDate(thaliaData.publishedDate || '');
          if (thaliaData.pageCount) {
            setPageCount(thaliaData.pageCount.toString());
          }
          setExtractSuccess(t('admin.dataExtracted', 'Book data successfully extracted'));
        } else if (activeTab === 'lehmanns') {
          if (!isValidLehmannsUrl(lehmannsUrl)) {
            throw new Error(t('admin.invalidLehmannsUrl', 'Invalid Lehmanns URL'));
          }
          
          const lehmannsData = await fetchBookDataFromLehmanns(lehmannsUrl);
          if (!lehmannsData) {
            throw new Error(t('admin.failedToExtract', 'Failed to extract book data'));
          }
          
          setTitle(lehmannsData.title);
          setAuthor(lehmannsData.author);
          setDescription(lehmannsData.description);
          setCoverUrl(lehmannsData.coverUrl);
          setLanguage(lehmannsData.language || 'german');
          setGenre(lehmannsData.genre || '');
          setType(lehmannsData.type || 'ebook');
          setIsbn(lehmannsData.isbn || '');
          if (lehmannsData.pageCount) {
            setPageCount(lehmannsData.pageCount.toString());
          }
          setExtractSuccess(t('admin.dataExtracted', 'Book data successfully extracted'));
        }
      } else {
        if (!isbnInput.trim()) {
          throw new Error(t('admin.invalidIsbn', 'Please enter a valid ISBN'));
        }
        
        const bookData = await getBookData(isbnInput.trim());
        if (!bookData) {
          throw new Error(t('admin.failedToFetchByIsbn', 'Failed to fetch book data for this ISBN'));
        }
        
        setTitle(bookData.title);
        setAuthor(bookData.author);
        setDescription(bookData.description);
        setCoverUrl(bookData.coverUrl);
        setLanguage(bookData.language || 'german');
        setGenre(bookData.genre || '');
        setType(bookData.type as 'ebook' | 'audiobook');
        setIsbn(bookData.isbn || isbnInput);
        setExternalId(bookData.asin || '');
        setPublisher(bookData.publisher || '');
        setPublishedDate(bookData.publishedDate || '');
        if (bookData.pageCount) {
          setPageCount(bookData.pageCount.toString());
        }
        setExtractSuccess(t('admin.isbnDataExtracted', 'Book data successfully extracted from ISBN'));
      }
    } catch (error) {
      console.error('Error extracting book data:', error);
      setExtractError((error as Error).message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      
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
    
    const fileExt = coverFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `covers/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(filePath, coverFile);
    
    if (uploadError) {
      throw uploadError;
    }
    
    const { data } = supabase.storage
      .from('book-covers')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!title || !author || !genre || !language || !description || !type || !downloadUrl) {
        throw new Error(t('admin.formValidationError'));
      }
      
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        finalCoverUrl = await uploadCover();
      }
      
      if (isEdit && book) {
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
  
  useEffect(() => {
    // Only run if this is a new book (not an edit) and we have URL parameters
    if (!isEdit && searchParams.has('title')) {
      setTitle(searchParams.get('title') || '');
      setAuthor(searchParams.get('author') || '');
      setGenre(searchParams.get('genre') || '');
      setLanguage(searchParams.get('language') || 'German');
      setDescription(searchParams.get('description') || '');
      setType((searchParams.get('type') || 'ebook') as 'ebook' | 'audiobook');
      setDownloadUrl(searchParams.get('downloadUrl') || '');
      setCoverUrl(searchParams.get('coverUrl') || '');
      setIsbn(searchParams.get('isbn') || '');
      setExternalId(searchParams.get('externalId') || '');
      setPublisher(searchParams.get('publisher') || '');
      setPublishedDate(searchParams.get('publishedDate') || '');
      setPageCount(searchParams.get('pageCount') || '');
      
      // Show a success message
      setSuccess(t('admin.autofillSuccess', 'Form auto-filled from scraper data'));
      
      // Scroll to form content
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight / 3,
          behavior: 'smooth'
        });
      }, 500);
    }
  }, [searchParams, isEdit, t]);

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

      {!isEdit && (
        <BookLinkContainer>
          <DataSourceToggle>
            <DataSourceButton 
              type="button"
              active={dataSource === 'url'} 
              onClick={() => setDataSource('url')}
            >
              <FiSearch /> {t('admin.useUrl', 'Use URL')}
            </DataSourceButton>
            <DataSourceButton 
              type="button"
              active={dataSource === 'isbn'} 
              onClick={() => setDataSource('isbn')}
            >
              <FiHash /> {t('admin.useIsbn', 'Use ISBN')}
            </DataSourceButton>
          </DataSourceToggle>

          {dataSource === 'url' ? (
            <>
              <SourceTabs>
                <SourceTab 
                  active={activeTab === 'thalia'} 
                  onClick={() => setActiveTab('thalia')}
                >
                  Thalia.de
                </SourceTab>
                <SourceTab 
                  active={activeTab === 'lehmanns'} 
                  onClick={() => setActiveTab('lehmanns')}
                >
                  Lehmanns
                </SourceTab>
              </SourceTabs>
              
              {activeTab === 'thalia' && (
                <InputRow>
                  <Input
                    type="url"
                    value={thaliaUrl}
                    onChange={(e) => setThaliaUrl(e.target.value)}
                    placeholder="https://www.thalia.de/shop/home/artikeldetails/..."
                    style={{ flexGrow: 1 }}
                  />
                  <FetchButton 
                    type="button" 
                    onClick={extractBookData}
                    disabled={!thaliaUrl || isExtracting}
                  >
                    {isExtracting ? <FiLoader className="spin" /> : <FiSearch />}
                    {t('admin.extract', 'Extract Data')}
                  </FetchButton>
                </InputRow>
              )}
              
              {activeTab === 'lehmanns' && (
                <InputRow>
                  <Input
                    type="url"
                    value={lehmannsUrl}
                    onChange={(e) => setLehmannsUrl(e.target.value)}
                    placeholder="https://www.lehmanns.de/shop/..."
                    style={{ flexGrow: 1 }}
                  />
                  <FetchButton 
                    type="button" 
                    onClick={extractBookData}
                    disabled={!lehmannsUrl || isExtracting}
                  >
                    {isExtracting ? <FiLoader className="spin" /> : <FiSearch />}
                    {t('admin.extract')}
                  </FetchButton>
                </InputRow>
              )}
            </>
          ) : (
            <InputRow>
              <Input
                type="text"
                value={isbnInput}
                onChange={(e) => setIsbnInput(e.target.value)}
                placeholder="Enter ISBN (e.g., 9783630876726)"
                style={{ flexGrow: 1 }}
              />
              <FetchButton 
                type="button" 
                onClick={extractBookData}
                disabled={!isbnInput || isExtracting}
              >
                {isExtracting ? <FiLoader className="spin" /> : <FiBookOpen />}
                {t('admin.fetchByIsbn', 'Fetch Data')}
              </FetchButton>
            </InputRow>
          )}
          
          {extractError && (
            <Alert>
              <FiAlertCircle /> {extractError}
            </Alert>
          )}
          
          {extractSuccess && (
            <AlertSuccess>
              <FiAlertCircle /> {extractSuccess}
            </AlertSuccess>
          )}
        </BookLinkContainer>
      )}
      
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
              onChange={(e) => setType(e.target.value as 'ebook' | 'audiobook' | 'Hörbuch')}
              required
            >
              <option value="ebook">{t('books.ebook')}</option>
              <option value="audiobook">{t('books.audiobook')}</option>
              <option value="Hörbuch">{t('books.hörbuch', 'Hörbuch')}</option>
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
            <Label htmlFor="pageCount">{t('books.pageCount', 'Page Count')}</Label>
            <Input
              id="pageCount"
              type="number"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              placeholder="123"
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
