import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiSave, FiX, FiUpload, FiAlertCircle } from 'react-icons/fi';
import { Book } from '../../types/supabase';
import { getSupabaseClient } from '../../utils/supabaseHelpers';

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

const FormTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
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
  const [coverUrl, setCoverUrl] = useState(book?.cover_url || '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
  
  const uploadCover = async (): Promise<string> => {
    if (!coverFile) {
      return coverUrl;
    }
    
    // Generate a unique file name
    const fileExt = coverFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `covers/${fileName}`;
    
    // Upload to Supabase Storage
    const supabase = getSupabaseClient();
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
        const supabase = getSupabaseClient();
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
            cover_url: finalCoverUrl
          })
          .eq('id', book.id);
        
        if (updateError) {
          throw updateError;
        }
        
        navigate('/admin/books');
      } else {
        // Create new book
        const supabase = getSupabaseClient();
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
            cover_url: finalCoverUrl
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
      <FormTitle>
        {isEdit ? t('admin.editBook') : t('admin.addBook')}
      </FormTitle>
      
      {error && (
        <Alert>
          <FiAlertCircle />
          {error}
        </Alert>
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
