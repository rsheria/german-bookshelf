import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiArrowLeft } from 'react-icons/fi';
import BookDetails from '../components/BookDetails';
import { useBook } from '../hooks/useBooks';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
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
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5rem 0;
  font-size: 1.2rem;
  color: #666;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #e74c3c;
`;

const BookDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { book, isLoading, error } = useBook(id || '');
  
  const handleBack = () => {
    navigate(-1);
  };
  
  // If book not found, redirect to home
  useEffect(() => {
    if (!isLoading && !book && !error) {
      navigate('/');
    }
  }, [book, isLoading, error, navigate]);
  
  return (
    <Container>
      <BackButton onClick={handleBack}>
        <FiArrowLeft /> {t('common.back')}
      </BackButton>
      
      {isLoading ? (
        <LoadingState>{t('common.loading')}</LoadingState>
      ) : error ? (
        <ErrorState>
          {t('common.error')}: {error.message}
        </ErrorState>
      ) : book ? (
        <BookDetails book={book} />
      ) : null}
    </Container>
  );
};

export default BookDetailsPage;
