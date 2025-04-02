import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiArrowLeft, FiEdit } from 'react-icons/fi';
import BookForm from '../../components/admin/BookForm';
import { useAuth } from '../../context/AuthContext';
import { useBook } from '../../hooks/useBooks';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: #3498db;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem 0;
  margin-bottom: 1rem;

  &:hover {
    text-decoration: underline;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #e74c3c;
  background-color: #f8d7da;
  border-radius: 8px;
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
      <Container>
        <LoadingState>{t('common.loading')}</LoadingState>
      </Container>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect to home
  }

  if (error) {
    return (
      <Container>
        <BackButton onClick={() => navigate('/admin/books')}>
          <FiArrowLeft /> {t('common.back')}
        </BackButton>
        <ErrorState>
          {t('common.error')}: {error.message}
        </ErrorState>
      </Container>
    );
  }

  if (!book) {
    return null; // Will redirect to book list
  }

  return (
    <Container>
      <BackButton onClick={() => navigate('/admin/books')}>
        <FiArrowLeft /> {t('common.back')}
      </BackButton>
      
      <Header>
        <Title>
          <FiEdit /> {t('admin.editBook')}
        </Title>
      </Header>
      
      <BookForm book={book} isEdit={true} />
    </Container>
  );
};

export default EditBookPage;
