import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiArrowLeft, FiEdit } from 'react-icons/fi';
import BookForm from '../../components/admin/BookForm';
import { useAuth } from '../../context/AuthContext';
import { useBook } from '../../hooks/useBooks';
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
`;

const ErrorState = styled.div`
  padding: 1.5rem;
  color: ${props => props.theme.colors.danger};
  background-color: rgba(220, 53, 69, 0.1);
  border-radius: ${props => props.theme.borderRadius.md};
  margin: 1.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EditBookPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { book, isLoading: bookLoading, error } = useBook(id || '');

  useEffect(() => {
    // Redirect if not admin
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Redirect if book not found
  useEffect(() => {
    if (!bookLoading && !book && !error) {
      navigate('/admin/books');
    }
  }, [book, bookLoading, error, navigate]);

  if (authLoading || bookLoading) {
    return (
      <AdminContainer>
        <LoadingState>{t('common.loading')}</LoadingState>
      </AdminContainer>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect to home
  }

  if (error) {
    return (
      <AdminContainer>
        <BackButton onClick={() => navigate('/admin/books')}>
          <FiArrowLeft /> {t('common.back')}
        </BackButton>
        <ErrorState>
          {t('common.error')}: {error.message}
        </ErrorState>
      </AdminContainer>
    );
  }

  if (!book) {
    return null; // Will redirect to book list
  }

  return (
    <AdminContainer>
      <BackButton onClick={() => navigate('/admin/books')}>
        <FiArrowLeft /> {t('common.back')}
      </BackButton>
      
      <AdminHeader>
        <AdminTitle>
          <FiEdit style={{ marginRight: '0.5rem' }} /> {t('admin.editBook')}: {book.title}
        </AdminTitle>
      </AdminHeader>
      
      <FormContainer>
        <BookForm book={book} isEdit={true} />
      </FormContainer>
    </AdminContainer>
  );
};

export default EditBookPage;
