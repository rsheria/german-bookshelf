import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiSave, FiX, FiUpload, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../../services/supabase';
import { Book } from '../../types/supabase';

interface BookFormProps {
  book?: Book;
  isEdit?: boolean;
}

const FormContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadows.md};
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

const CenteredFormRow = styled(FormRow)`
  justify-content: center;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FullRowFormGroup = styled(FormGroup)`
  grid-column: span 2;
  text-align: center;
  align-items: center;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  background-color: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Textarea = styled.textarea`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  min-height: 150px;
  resize: vertical;
  background-color: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Select = styled.select`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  background-color: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
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
  transition: all 0.2s ease;
`;

const SaveButton = styled(Button)`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryLight};
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.disabled};
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled(Button)`
  background-color: ${({ theme }) => theme.colors.card};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};

  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
    transform: translateY(-2px);
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
  background-color: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: fit-content;

  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundHover};
    transform: translateY(-2px);
  }
`;

const Alert = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${({ theme }) => theme.colors.error}40; /* 40 for transparency */
  color: ${({ theme }) => theme.colors.error};
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.error};
`;

const AlertSuccess = styled(Alert)`
  background-color: ${({ theme }) => theme.colors.success}40; /* 40 for transparency */
  color: ${({ theme }) => theme.colors.success};
  border: 1px solid ${({ theme }) => theme.colors.success};
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, auto));
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  margin: 0.5rem 0;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
`;

// Styled dropdown for file types
const Dropdown = styled.details`
  position: relative;
  display: inline-block;
  margin: 0.5rem auto;
  min-width: 200px;
`;

const DropdownSummary = styled.summary`
  list-style: none;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 0.75rem 1rem;
  text-align: center;
  background-color: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.text};
  &::-webkit-details-marker { display: none; }
`;

const DropdownContent = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  background-color: ${({ theme }) => theme.colors.input};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 0.5rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  z-index: 100;
`;

const BookForm: React.FC<BookFormProps> = ({ book, isEdit = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const initialCategories = book?.categories
    ? book.categories.join(', ')
    : book?.genre
      ? book.genre.split(/>|,/).map((s) => s.trim()).filter(Boolean).join(', ')
      : '';
  const [categories, setCategories] = useState(initialCategories);
  
  const [title, setTitle] = useState(book?.title || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [language, setLanguage] = useState(book?.language || 'German');
  const [description, setDescription] = useState(book?.description || '');
  const [type, setType] = useState(book?.type || 'ebook');
  const [downloadUrl, setDownloadUrl] = useState(book?.download_url || '');
  const [isbn, setIsbn] = useState(book?.isbn || '');
  const [externalId, setExternalId] = useState(book?.external_id || '');
  const [publishedDate, setPublishedDate] = useState(book?.published_date || '');
  const [publisher, setPublisher] = useState(book?.publisher || '');
  const [pageCount, setPageCount] = useState(book?.page_count?.toString() || '');
  const [fictionType, setFictionType] = useState(book?.fictionType || '');
  
  const [coverUrl, setCoverUrl] = useState(book?.cover_url || '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  const [narrator, setNarrator] = useState(book?.narrator || '');
  const [audioLength, setAudioLength] = useState(book?.audio_length || '');
  const [fileSize, setFileSize] = useState(book?.file_size || '');
  const [fileTypes, setFileTypes] = useState<string[]>(() => (
    book?.type === 'ebook'
      ? (book.ebook_format ? book.ebook_format.split(',').map(f => f.trim()) : [])
      : book?.type === 'audiobook'
        ? (book.audio_format ? book.audio_format.split(',').map(f => f.trim()) : [])
        : []
  ));
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess(t('admin.bookSaved', 'Book saved successfully!'));
    }
  }, [searchParams, t]);

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
      if (!title || !author || !language || !description || !type || !downloadUrl) {
        throw new Error(t('admin.formValidationError'));
      }
      
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        finalCoverUrl = await uploadCover();
      }
      
      const bookPayload: Omit<Book, 'id' | 'created_at' | 'updated_at'> = {
        title,
        author,
        genre: categories.split(',').map((cat) => cat.trim()).filter(Boolean).join(' > '),
        language,
        description,
        cover_url: finalCoverUrl,
        type,
        download_url: downloadUrl,
        isbn,
        external_id: externalId,
        publisher,
        published_date: publishedDate,
        page_count: pageCount ? Number(pageCount) : undefined,
        fictionType: fictionType as 'Fiction' | 'Non-Fiction' | undefined,
        narrator: narrator || undefined,
        audio_length: audioLength,
        file_size: fileSize,
        ebook_format: type === 'ebook' ? fileTypes.join(',') : undefined,
        audio_format: type === 'audiobook' ? fileTypes.join(',') : undefined,
        categories: categories.split(',').map((cat) => cat.trim()).filter(Boolean),
      };
      
      if (isEdit && book) {
        const { error: updateError } = await supabase
          .from('books')
          .update(bookPayload)
          .eq('id', book.id);
        
        if (updateError) {
          throw updateError;
        }
        
        navigate('/admin/books');
      } else {
        const { error: insertError } = await supabase
          .from('books')
          .insert(bookPayload);
        
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
          <FiAlertCircle />
          {error}
        </Alert>
      )}
      
      {success && (
        <AlertSuccess>
          <FiAlertCircle />
          {success}
        </AlertSuccess>
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
          
          <FormGroup>
            <Label htmlFor="type">{t('books.type')} *</Label>
            <Select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as Book['type'])}
              required
            >
              <option value="ebook">E-Book</option>
              <option value="audiobook">Hörbuch (Audiobook)</option>
            </Select>
          </FormGroup>
        </FormRow>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="fictionType">{t('books.fictionType')}</Label>
            <Select
              id="fictionType"
              value={fictionType}
              onChange={(e) => setFictionType(e.target.value)}
            >
              <option value="">--</option>
              <option value="Fiction">{t('books.fiction')}</option>
              <option value="Non-Fiction">{t('books.nonfiction')}</option>
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
            <Label htmlFor="categories">Kategorien (Kommagetrennt)</Label>
            <Input
              id="categories"
              type="text"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="Krimi, Thriller, Klassiker"
            />
          </FormGroup>
          
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
        </FormRow>

        <FormRow>
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
        </FormRow>
        
        <FormRow>
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
        
        {/* Always show audiobook fields */}
        {true && (
          <FormRow>
            <FormGroup>
              <Label htmlFor="narrator" style={{ fontWeight: 'bold' }}>Sprecher*in (Narrator)</Label>
              <Input
                id="narrator"
                type="text"
                value={narrator}
                onChange={(e) => setNarrator(e.target.value)}
                placeholder="Max Mustermann, Elisa Schmidt"
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="audioLength" style={{ fontWeight: 'bold' }}>Hörbuch-Länge (Audio Length)</Label>
              <Input
                id="audioLength"
                type="text"
                value={audioLength}
                onChange={(e) => setAudioLength(e.target.value)}
                placeholder="11 hrs and 47 mins, 10h 23m, 7:30:00"
              />
            </FormGroup>
          </FormRow>
        )}
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="fileSize">Dateigröße (File Size)</Label>
            <Input
              id="fileSize"
              type="text"
              value={fileSize}
              onChange={(e) => setFileSize(e.target.value)}
              placeholder="z.B. 250MB"
            />
          </FormGroup>
        </FormRow>
        
        <CenteredFormRow>
          <FullRowFormGroup>
            <Label>{t('admin.fileTypes', 'File Type(s)')}</Label>
            <Dropdown>
              <DropdownSummary>
                {fileTypes.length > 0
                  ? fileTypes.map(f => f.toUpperCase()).join(', ')
                  : t('admin.selectFormats', 'Select Formats')
                }
              </DropdownSummary>
              <DropdownContent>
                <CheckboxGrid>
                  {['pdf','epub','mobi','azw3','mp3'].map((ft) => (
                    <CheckboxLabel key={ft}>
                      <input
                        type="checkbox"
                        value={ft}
                        checked={fileTypes.includes(ft)}
                        onChange={(e) => {
                          const { checked } = e.target;
                          setFileTypes(prev =>
                            checked ? [...prev, ft] : prev.filter(x => x !== ft)
                          );
                        }}
                      />
                      {ft.toUpperCase()}
                    </CheckboxLabel>
                  ))}
                </CheckboxGrid>
              </DropdownContent>
            </Dropdown>
          </FullRowFormGroup>
        </CenteredFormRow>
        
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
