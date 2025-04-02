import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiDownload, FiHeadphones, FiBook, FiAlertCircle } from 'react-icons/fi';
import { Book } from '../types/supabase';
import { useDownloads } from '../hooks/useDownloads';
import { useAuth } from '../context/AuthContext';

interface BookDetailsProps {
  book: Book;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 2rem;
  }
`;

const CoverContainer = styled.div`
  width: 100%;
  max-width: 300px;
  margin: 0 auto 2rem;

  @media (min-width: 768px) {
    margin: 0;
    flex-shrink: 0;
  }
`;

const Cover = styled.img`
  width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
`;

const BookInfo = styled.div`
  flex-grow: 1;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
`;

const Author = styled.h2`
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  font-weight: 500;
  color: #666;
`;

const BookType = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
`;

const MetaInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const MetaLabel = styled.span`
  font-size: 0.8rem;
  color: #666;
`;

const MetaValue = styled.span`
  font-size: 1rem;
  font-weight: 500;
`;

const Description = styled.div`
  margin-bottom: 2rem;
  line-height: 1.6;
  color: #333;
`;

const DownloadButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
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
  margin-top: 1rem;
`;

const LoginPrompt = styled.div`
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  text-align: center;
`;

const LoginLink = styled.a`
  color: #3498db;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const BookDetails: React.FC<BookDetailsProps> = ({ book }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { downloadBook, isLoading, error, remainingQuota, checkRemainingQuota } = useDownloads();
  const [showError, setShowError] = useState(false);

  const handleDownload = async () => {
    if (!user) return;
    
    // Check quota first if not already checked
    if (remainingQuota === null) {
      await checkRemainingQuota();
    }
    
    // Make sure download_url exists before passing it
    const downloadUrl = book.download_url || '';
    const success = await downloadBook(book.id, downloadUrl);
    if (!success) {
      setShowError(true);
    }
  };

  const placeholderCover = 'https://via.placeholder.com/300x450?text=No+Cover';

  return (
    <Container>
      <CoverContainer>
        <Cover 
          src={book.cover_url || placeholderCover} 
          alt={`${book.title} cover`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = placeholderCover;
          }}
        />
      </CoverContainer>
      
      <BookInfo>
        <Title>{book.title}</Title>
        <Author>{book.author}</Author>
        
        <BookType>
          {book.type === 'audiobook' ? (
            <>
              <FiHeadphones /> {t('books.audiobook')}
            </>
          ) : (
            <>
              <FiBook /> {t('books.ebook')}
            </>
          )}
        </BookType>
        
        <MetaInfo>
          <MetaItem>
            <MetaLabel>{t('books.genre')}</MetaLabel>
            <MetaValue>{book.genre}</MetaValue>
          </MetaItem>
          
          <MetaItem>
            <MetaLabel>{t('books.language')}</MetaLabel>
            <MetaValue>{book.language}</MetaValue>
          </MetaItem>
        </MetaInfo>
        
        <Description>
          {book.description}
        </Description>
        
        {user ? (
          <>
            <DownloadButton 
              onClick={handleDownload} 
              disabled={isLoading || (remainingQuota !== null && remainingQuota <= 0)}
            >
              <FiDownload /> 
              {isLoading 
                ? t('common.loading')
                : remainingQuota !== null && remainingQuota <= 0
                  ? t('books.downloadLimit')
                  : t('books.download')
              }
            </DownloadButton>
            
            {remainingQuota !== null && remainingQuota > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                {t('profile.quotaRemaining')}: {remainingQuota}
              </div>
            )}
            
            {(showError || error) && (
              <Alert>
                <FiAlertCircle />
                {error?.message || t('books.downloadError')}
              </Alert>
            )}
          </>
        ) : (
          <LoginPrompt>
            {t('auth.loginTitle')} <LoginLink href="/login">{t('nav.login')}</LoginLink> {t('common.or')} <LoginLink href="/signup">{t('nav.signup')}</LoginLink> {t('books.download').toLowerCase()}.
          </LoginPrompt>
        )}
      </BookInfo>
    </Container>
  );
};

export default BookDetails;
