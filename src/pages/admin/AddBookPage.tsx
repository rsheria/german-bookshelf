import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiArrowLeft, FiPlus } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import BookForm from '../../components/admin/BookForm';

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

const AddBookPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Redirect if not admin
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  if (authLoading) {
    return (
      <Container>
        <LoadingState>{t('common.loading')}</LoadingState>
      </Container>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect to home
  }

  return (
    <Container>
      <BackButton onClick={() => navigate('/admin/books')}>
        <FiArrowLeft /> {t('common.back')}
      </BackButton>
      
      <Header>
        <Title>
          <FiPlus /> {t('admin.addBook')}
        </Title>
      </Header>
      
      <BookForm />
    </Container>
  );
};

export default AddBookPage;
