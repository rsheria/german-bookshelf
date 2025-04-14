import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiDownload, FiHeadphones, FiBook, FiAlertCircle } from 'react-icons/fi';
import { Book } from '../types/supabase';
import { useDownloads } from '../hooks/useDownloads';
import { useAuth } from '../context/AuthContext';
import RatingSystem from './RatingSystem';

interface BookDetailsProps {
  book: Book;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 1200px;
  margin: 0 auto;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: ${({ theme }) => theme.spacing.xl};
  }
`;

const CoverContainer = styled.div`
  width: 100%;
  max-width: 300px;
  margin: 0 auto ${({ theme }) => theme.spacing.xl};

  @media (min-width: 768px) {
    margin: 0;
    flex-shrink: 0;
  }
`;

const Cover = styled.img`
  width: 100%;
  height: auto;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const BookInfo = styled.div`
  flex-grow: 1;
`;

const Title = styled.h1`
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
`;

const Author = styled.h2`
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BookType = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text};
`;

const MetaInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const MetaLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const MetaValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  color: ${({ theme }) => theme.colors.description};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
`;

const DownloadButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.card};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryLight};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.textSecondary};
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Alert = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.error};
  color: white;
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const LoginPrompt = styled.div`
  background-color: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
`;

const LoginLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
    color: ${({ theme }) => theme.colors.primaryLight};
  }
`;

const RatingTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const QuotaText = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  opacity: 0.9;
`;

const BookDetails: React.FC<BookDetailsProps> = ({ book }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { downloadBook, isLoading, error, remainingQuota, checkRemainingQuota } = useDownloads();
  const [showError, setShowError] = useState(false);
  const [bookRating, setBookRating] = useState<number | undefined>(book.rating);

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

        {/* Rating System */}
        <div style={{ marginBottom: '1.5rem' }}>
          <RatingTitle>{t('ratings.title')}</RatingTitle>
          <RatingSystem 
            bookId={book.id} 
            currentRating={bookRating}
            onRatingChange={(newRating) => setBookRating(newRating)}
          />
        </div>
        
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
              <QuotaText>
                {t('profile.quotaRemaining')}: {remainingQuota}
              </QuotaText>
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
