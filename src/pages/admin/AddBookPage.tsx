import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiArrowLeft, FiPlus } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { Book } from '../../types/supabase';
import BookForm from '../../components/admin/BookForm';
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
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  padding: 0.75rem;
  margin-bottom: 1rem;
  transition: all 0.2s;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  
  &:hover {
    transform: translateX(-3px);
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme }) => theme.colors.primary};
  }

  svg {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.2rem;
  }
`;

const FormContainer = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};
  padding: 2rem;
  margin-top: 1rem;
`;

const AddBookPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  // Helper: parse query param (string or undefined)
  const qp = (key: string) => {
    const val = searchParams.get(key);
    return val !== null ? val : undefined;
  };

  // Helper: parse number param
  const qn = (key: string) => {
    const val = searchParams.get(key);
    return val !== null && val !== '' ? Number(val) : undefined;
  };

  // Helper: parse categories as array
  const qarr = (key: string) => {
    const val = searchParams.get(key);
    return val ? val.split(',').map((c) => c.trim()).filter(Boolean) : undefined;
  };

  // Build book object from query params (only if at least one relevant param is present)
  const bookFromParams: Partial<Book> = {
    title: qp('title'),
    author: qp('author'),
    genre: qp('genre'),
    language: qp('language'),
    description: qp('description'),
    cover_url: qp('cover_url'),
    type: qp('type') as Book['type'],
    download_url: qp('download_url'),
    isbn: qp('isbn'),
    external_id: qp('external_id'),
    publisher: qp('publisher'),
    published_date: qp('published_date'),
    page_count: qn('page_count'),
    narrator: qp('narrator'),
    audio_length: qp('audio_length'),
    audio_format: qp('audio_format'),
    ebook_format: qp('ebook_format'),
    file_size: qp('file_size'),
    categories: qarr('categories'),
  };
  const hasBookParams = Object.values(bookFromParams).some((v) => v !== undefined && v !== '');

  useEffect(() => {
    // Redirect if not admin
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

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
      <BackButton onClick={() => navigate('/admin/books')}>
        <FiArrowLeft /> {t('common.back')}
      </BackButton>
      <AdminHeader>
        <AdminTitle>
          <FiPlus style={{ marginRight: '0.5rem' }} /> {t('admin.addBook')}
        </AdminTitle>
      </AdminHeader>
      <FormContainer>
        <BookForm book={hasBookParams ? (bookFromParams as Book) : undefined} />
      </FormContainer>
    </AdminContainer>
  );
};

export default AddBookPage;
