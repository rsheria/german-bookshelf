import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { FiDownload, FiHeadphones, FiBook, FiAlertCircle, FiBookmark, FiShare2, FiStar, FiUser } from 'react-icons/fi';
import { Book } from '../types/supabase';
import { useDownloads } from '../hooks/useDownloads';
import { useAuth } from '../context/AuthContext';
import RatingSystem from './RatingSystem';

interface BookDetailsProps {
  book: Book;
}

// Breadcrumb navigation
const BreadcrumbNav = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BreadcrumbSeparator = styled.span`
  margin: 0 ${({ theme }) => theme.spacing.sm};
`;

const CategoryLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

// Main container with improved layout
const Container = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  color: ${({ theme }) => theme.colors.text};

  @media (min-width: 768px) {
    flex-direction: row;
    gap: ${({ theme }) => theme.spacing.xl};
  }
`;

// Enhanced cover container
const CoverContainer = styled.div`
  width: 100%;
  max-width: 280px;
  margin: 0 auto ${({ theme }) => theme.spacing.xl};

  @media (min-width: 768px) {
    margin: 0;
    flex-shrink: 0;
  }
`;

const Cover = styled.img`
  width: 100%;
  height: auto;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  aspect-ratio: 2/3;
  object-fit: cover;
`;

// Book info with improved styling
const BookInfo = styled.div`
  flex-grow: 1;
`;

const Title = styled.h1`
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  line-height: 1.2;
`;

const Author = styled.h2`
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

// Rating container with stars
const RatingContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Stars = styled.div`
  display: flex;
  color: #f8ba00;
  margin-right: ${({ theme }) => theme.spacing.sm};
`;

const RatingText = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  margin-right: ${({ theme }) => theme.spacing.md};
`;

const CommentsCount = styled.div`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  
  svg {
    margin-right: 4px;
  }
`;

const BookType = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
`;

const PublisherInfo = styled.div`
  font-style: italic;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// Book description with read more functionality
const Description = styled.div`
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ReadMoreButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  display: flex;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.sm};
  
  &:hover {
    text-decoration: underline;
  }
  
  &:after {
    content: ${props => props.children === 'Read more' ? '"+"' : '"-"'};
    margin-left: 4px;
  }
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.spacing.md} 0;
  width: 100%;
`;

// Metadata grid
const MetadataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  
  @media (min-width: 992px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const MetadataSection = styled.div``;

const MetadataLabel = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const MetadataValue = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

// Action buttons with modern styling
const ActionButtonsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
  
  @media (max-width: 576px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const DownloadButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 150px;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryLight};
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.textSecondary};
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background-color: transparent;
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// Error and login components
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
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const LoginLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
    color: ${({ theme }) => theme.colors.primaryLight};
  }
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
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
  
  // Format description with read more functionality
  const fullDescription = book.description || '';
  const displayDescription = isDescriptionExpanded || fullDescription.length <= 300
    ? fullDescription
    : `${fullDescription.substring(0, 300)}...`;

  // Render star rating
  const renderStarRating = (rating: number = 0) => {
    const fullStars = Math.floor(rating);
    const stars = [];
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FiStar key={`star-${i}`} style={{ fill: '#f8ba00', color: '#f8ba00' }} />);
      } else {
        stars.push(<FiStar key={`star-${i}`} style={{ color: '#f8ba00' }} />);
      }
    }
    
    return <Stars>{stars}</Stars>;
  };

  return (
    <>
      {/* Breadcrumb navigation */}
      <BreadcrumbNav>
        <CategoryLink to={`/search?query=${encodeURIComponent(book.genre)}`}>
          {book.genre}
        </CategoryLink>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <CategoryLink to={`/search?query=${encodeURIComponent(book.language)}`}>
          {book.language}
        </CategoryLink>
      </BreadcrumbNav>
      
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
          
          <RatingContainer>
            {renderStarRating(book.rating || 0)}
            <RatingText>{(book.rating || 0).toFixed(1)}/5.0</RatingText>
            <CommentsCount>
              <FiUser />
              {t('ratings.title')}
            </CommentsCount>
          </RatingContainer>
          
          <BookType>
            {book.type === 'audiobook' || book.type === 'Hörbuch' ? (
              <>
                <FiHeadphones /> {t('books.audiobook')}
              </>
            ) : (
              <>
                <FiBook /> {t('books.ebook')}
              </>
            )}
          </BookType>
          
          {book.publisher && (
            <PublisherInfo>
              {book.publisher}
              {book.published_date && ` • ${new Date(book.published_date).getFullYear()}`}
            </PublisherInfo>
          )}
          
          <Description>
            {displayDescription}
          </Description>
          
          {fullDescription.length > 300 && (
            <ReadMoreButton onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
              {isDescriptionExpanded ? t('common.showLess') : t('common.readMore')}
            </ReadMoreButton>
          )}
          
          <Divider />
          
          {/* Metadata grid */}
          <MetadataGrid>
            <MetadataSection>
              <MetadataLabel>{t('books.genre')}</MetadataLabel>
              <MetadataValue>{book.genre}</MetadataValue>
            </MetadataSection>
            
            <MetadataSection>
              <MetadataLabel>{t('books.type')}</MetadataLabel>
              <MetadataValue>{book.type === 'audiobook' || book.type === 'Hörbuch' ? t('books.audiobook') : t('books.ebook')}</MetadataValue>
            </MetadataSection>
            
            {book.publisher && (
              <MetadataSection>
                <MetadataLabel>{t('books.publisher')}</MetadataLabel>
                <MetadataValue>{book.publisher}</MetadataValue>
              </MetadataSection>
            )}
            
            {book.published_date && (
              <MetadataSection>
                <MetadataLabel>{t('books.year')}</MetadataLabel>
                <MetadataValue>{new Date(book.published_date).getFullYear()}</MetadataValue>
              </MetadataSection>
            )}
            
            {book.page_count && (
              <MetadataSection>
                <MetadataLabel>{t('books.pages')}</MetadataLabel>
                <MetadataValue>{book.page_count}</MetadataValue>
              </MetadataSection>
            )}
            
            <MetadataSection>
              <MetadataLabel>{t('books.language')}</MetadataLabel>
              <MetadataValue>{book.language}</MetadataValue>
            </MetadataSection>
            
            {book.isbn && (
              <MetadataSection>
                <MetadataLabel>ISBN</MetadataLabel>
                <MetadataValue>{book.isbn}</MetadataValue>
              </MetadataSection>
            )}
            
            {book.external_id && (
              <MetadataSection>
                <MetadataLabel>ID</MetadataLabel>
                <MetadataValue>{book.external_id}</MetadataValue>
              </MetadataSection>
            )}
          </MetadataGrid>
          
          {/* Custom rating component */}
          <div style={{ marginBottom: '1.5rem' }}>
            <RatingSystem 
              bookId={book.id} 
              currentRating={bookRating}
              onRatingChange={(newRating) => setBookRating(newRating)}
            />
          </div>
          
          {/* Action buttons */}
          <ActionButtonsContainer>
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
                
                <SecondaryButton>
                  <FiBookmark />
                  {t('books.addToLibrary')}
                </SecondaryButton>
                
                <SecondaryButton>
                  <FiShare2 />
                  {t('common.share')}
                </SecondaryButton>
              </>
            ) : (
              <LoginPrompt>
                {t('auth.loginTitle')} <LoginLink to="/login">{t('nav.login')}</LoginLink> {t('common.or')} <LoginLink to="/signup">{t('nav.signup')}</LoginLink> {t('books.toDownload')}.
              </LoginPrompt>
            )}
          </ActionButtonsContainer>
          
          {user && remainingQuota !== null && remainingQuota > 0 && (
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
        </BookInfo>
      </Container>
    </>
  );
};

export default BookDetails;
