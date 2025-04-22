import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiArrowLeft } from 'react-icons/fi';
import BookDetails from '../components/BookDetails';
import { useBookBySlug } from '../hooks/useBooks';
import { AdminContainer, LoadingState } from '../styles/adminStyles';

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  font-size: ${props => props.theme.typography.fontSize.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};
  transition: all 0.2s ease;
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};

  &:hover {
    transform: translateX(-3px);
    background: ${props => props.theme.colors.primaryLight};
  }

  &:active {
    transform: translateX(0);
    background: ${props => props.theme.colors.primaryDark};
  }
`;

const ErrorState = styled.div`
  padding: ${props => props.theme.spacing.xl};
  color: white;
  background-color: ${props => props.theme.colors.error};
  border-radius: ${props => props.theme.borderRadius.md};
  margin: ${props => props.theme.spacing.xl} 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: ${props => props.theme.shadows.md};
`;

const BookDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Parse URL path segments for SEO-friendly routing
  const navigateLocation = useLocation();
  const parts = navigateLocation.pathname.split('/');
  const typeParam = parts[1] || 'book';
  const seq = parts[2] || '';
  const slugWithHtml = parts[3] || '';
  const slug = slugWithHtml.replace(/\.html$/, '');
  const { book, isLoading, error } = useBookBySlug(typeParam, seq, slug);
  
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
    <AdminContainer>
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
    </AdminContainer>
  );
};

export default BookDetailsPage;
