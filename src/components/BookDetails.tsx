import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import { FiDownload, FiHeadphones, FiBook, FiAlertCircle, FiBookmark, FiShare2, FiStar, FiUser, FiLoader } from 'react-icons/fi';
import { Book } from '../types/supabase';
import { useDownloads } from '../hooks/useDownloads';
import { useAuth } from '../context/AuthContext';
import { useRelatedBooks } from '../hooks/useBooks';
import RatingSystem from './RatingSystem';
import i18next from 'i18next';

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
  color: #F3C775; /* Gold color for better visibility in dark mode */
  cursor: pointer;
  font-size: 14px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  transition: all 0.2s ease;
  background-color: rgba(243, 199, 117, 0.1); /* Very light gold background */
  
  &:hover {
    background-color: rgba(243, 199, 117, 0.2); /* Slightly more visible on hover */
    text-decoration: underline;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  &:focus {
    outline: 2px solid rgba(243, 199, 117, 0.5);
  }
  
  &:after {
    content: ${props => props.children === 'Read more' ? '"+"' : '"-"'};
    margin-left: 6px;
    font-weight: bold;
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

// Related section styling
const RelatedSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const BookGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
`;

const RelatedBookCard = styled.div`
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
  }
`;

const RelatedBookCover = styled.img`
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const RelatedBookTitle = styled(Link)`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const RelatedBookAuthor = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const RelatedBookType = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const LoadMoreButton = styled.button`
  display: block;
  margin: ${({ theme }) => theme.spacing.xl} auto 0;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
    transform: translateY(-2px);
    color: ${({ theme }) => theme.colors.primary};
  }
  
  &:after {
    content: "↓";
    margin-left: 6px;
  }
`;

// Add a keyframes animation for the loader
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Loading spinner component 
const Spinner = styled(FiLoader)`
  animation: ${spin} 1s linear infinite;
  font-size: 24px;
  color: ${({ theme }) => theme.colors.primary};
`;

// Add styled tag for categories
const CategoryTag = styled(Link)`
  display: inline-block;
  background: ${({ theme }) => theme.colors.primary}22;
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 16px;
  padding: 4px 14px;
  font-size: 13px;
  font-weight: 500;
  margin: 0 8px 8px 0;
  text-decoration: none;
  transition: background 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.primary}55;
    color: white;
  }
`;

const BookDetails: React.FC<BookDetailsProps> = ({ book }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { downloadBook, isLoading, error, remainingQuota, checkRemainingQuota } = useDownloads();
  const [showError, setShowError] = useState(false);
  const [bookRating, setBookRating] = useState<number | undefined>(book.rating);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [visibleRelatedBooks, setVisibleRelatedBooks] = useState(12);
  
  // Fetch related books
  const { relatedBooks, isLoading: relatedBooksLoading } = useRelatedBooks(book, 24);
  
  const handleLoadMore = () => {
    setVisibleRelatedBooks(prev => Math.min(prev + 12, relatedBooks.length));
  };
  
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
            {/* FICTION/NON-FICTION FIELD */}
            {book.fictionType && (
              <MetadataSection>
                <MetadataLabel>{t('books.fictionType')}</MetadataLabel>
                <MetadataValue>
                  {(() => {
                    const key = `fictionType.${book.fictionType.toLowerCase()}`;
                    const localized = i18next.t(key);
                    return localized !== key ? localized : book.fictionType;
                  })()}
                </MetadataValue>
              </MetadataSection>
            )}
            
            {/* GENRE: Show as a clean, deduplicated, comma-separated list, localized */}
            {book.genre && (
              <MetadataSection>
                <MetadataLabel>{t('books.genre')}</MetadataLabel>
                <MetadataValue>
                  {(() => {
                    // Clean genre string: remove 'Kindle eBooks', split by '>', '&', ',', deduplicate, trim, join
                    const blacklist = ['kindle ebooks'];
                    let parts = book.genre
                      .replace(/Kindle eBooks/gi, '')
                      .split(/>|&|,/)
                      .map(p => p.trim())
                      .filter(Boolean)
                      .map(p => p.replace(/\(\d+\)$/g, '').trim().toLowerCase())
                      .filter((p, i, arr) => p && arr.indexOf(p) === i && !blacklist.includes(p));
                    // Localize each part if translation exists
                    parts = parts.map(p => {
                      const key = `categories.${p}`;
                      const localized = i18next.t(key);
                      // Only use localized if actually translated (not the same as key)
                      return localized !== key ? localized : p.replace(/\b\w/g, c => c.toUpperCase());
                    });
                    return parts.join(', ');
                  })()}
                </MetadataValue>
              </MetadataSection>
            )}

            {/* TYPE */}
            <MetadataSection>
              <MetadataLabel>{t('books.type')}</MetadataLabel>
              <MetadataValue>{book.type === 'audiobook' || book.type === 'Hörbuch' ? t('books.audiobook') : t('books.ebook')}</MetadataValue>
            </MetadataSection>

            {/* AUDIOBOOK FIELDS */}
            {(book.type === 'audiobook' || book.type === 'Hörbuch') && (
              <>
                {book.narrator && (
                  <MetadataSection>
                    <MetadataLabel>{t('books.narrator')}</MetadataLabel>
                    <MetadataValue>{book.narrator}</MetadataValue>
                  </MetadataSection>
                )}
                {book.audio_length && (
                  <MetadataSection>
                    <MetadataLabel>{t('books.audioLength')}</MetadataLabel>
                    <MetadataValue>{book.audio_length}</MetadataValue>
                  </MetadataSection>
                )}
                {book.audio_format && (
                  <MetadataSection>
                    <MetadataLabel>{t('books.audioFormat')}</MetadataLabel>
                    <MetadataValue>{book.audio_format}</MetadataValue>
                  </MetadataSection>
                )}
              </>
            )}

            {/* EBOOK FIELDS */}
            {book.type === 'ebook' && (
              <>
                {book.ebook_format && (
                  <MetadataSection>
                    <MetadataLabel>{t('books.ebookFormat')}</MetadataLabel>
                    <MetadataValue>{book.ebook_format}</MetadataValue>
                  </MetadataSection>
                )}
                {book.page_count && (
                  <MetadataSection>
                    <MetadataLabel>{t('books.pages')}</MetadataLabel>
                    <MetadataValue>{book.page_count}</MetadataValue>
                  </MetadataSection>
                )}
              </>
            )}

            {/* FILE SIZE (for both types) */}
            {book.file_size && (
              <MetadataSection>
                <MetadataLabel>{t('books.fileSize')}</MetadataLabel>
                <MetadataValue>{book.file_size}</MetadataValue>
              </MetadataSection>
            )}

            {/* PUBLISHER */}
            {book.publisher && (
              <MetadataSection>
                <MetadataLabel>{t('books.publisher')}</MetadataLabel>
                <MetadataValue>{book.publisher}</MetadataValue>
              </MetadataSection>
            )}

            {/* YEAR */}
            {book.published_date && (
              <MetadataSection>
                <MetadataLabel>{t('books.year')}</MetadataLabel>
                <MetadataValue>{new Date(book.published_date).getFullYear()}</MetadataValue>
              </MetadataSection>
            )}

            {/* LANGUAGE */}
            <MetadataSection>
              <MetadataLabel>{t('books.language')}</MetadataLabel>
              <MetadataValue>{book.language}</MetadataValue>
            </MetadataSection>

            {/* ISBN */}
            {book.isbn && (
              <MetadataSection>
                <MetadataLabel>ISBN</MetadataLabel>
                <MetadataValue>{book.isbn}</MetadataValue>
              </MetadataSection>
            )}

            {/* EXTERNAL ID */}
            {book.external_id && (
              <MetadataSection>
                <MetadataLabel>{t('books.id')}</MetadataLabel>
                <MetadataValue>{book.external_id}</MetadataValue>
              </MetadataSection>
            )}
          </MetadataGrid>
          
          {/* Categories */}
          {book.categories && book.categories.length > 0 && (
            <div style={{ margin: '16px 0' }}>
              <MetadataLabel>{t('books.categories')}</MetadataLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(() => {
                  // Flatten, clean, deduplicate, remove 'Kindle eBooks', split by '>', '&', ','
                  const blacklist = ['kindle ebooks'];
                  const all = book.categories.flatMap(cat =>
                    cat
                      .replace(/Kindle eBooks/gi, '')
                      .split(/>|&|,/)
                      .map(p => p.trim())
                      .filter(Boolean)
                      .map(p => p.replace(/\(\d+\)$/g, '').trim().toLowerCase())
                  );
                  const unique = Array.from(new Set(all.filter(p => p && !blacklist.includes(p))));
                  return unique.map(cat => {
                    const key = `categories.${cat}`;
                    const label = i18next.t(key);
                    const display = label !== key ? label : cat.replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <CategoryTag key={cat} to={`/books?category=${encodeURIComponent(cat)}`}>{display}</CategoryTag>
                    );
                  });
                })()}
              </div>
            </div>
          )}
          
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
      
      {/* Related Books Section */}
      {relatedBooks.length > 0 ? (
        <RelatedSection>
          <SectionTitle>{t('books.relatedTitle', 'You may be interested in')}</SectionTitle>
          
          {relatedBooksLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spinner />
              <div style={{ marginTop: '10px' }}>{t('common.loading', 'Loading...')}</div>
            </div>
          ) : (
            <>
              <BookGrid>
                {relatedBooks.slice(0, visibleRelatedBooks).map(relatedBook => (
                  <RelatedBookCard key={relatedBook.id}>
                    <Link to={`/book/${relatedBook.id}`}>
                      <RelatedBookCover 
                        src={relatedBook.cover_url || placeholderCover} 
                        alt={relatedBook.title}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = placeholderCover;
                        }}
                      />
                    </Link>
                    <RelatedBookTitle to={`/book/${relatedBook.id}`}>
                      {relatedBook.title}
                    </RelatedBookTitle>
                    <RelatedBookAuthor>{relatedBook.author}</RelatedBookAuthor>
                    <RelatedBookType>
                      {relatedBook.type === 'audiobook' || relatedBook.type === 'Hörbuch' ? (
                        <>
                          <FiHeadphones size={10} /> {t('books.audiobook')}
                        </>
                      ) : (
                        <>
                          <FiBook size={10} /> {t('books.ebook')}
                        </>
                      )}
                    </RelatedBookType>
                  </RelatedBookCard>
                ))}
              </BookGrid>
              
              {visibleRelatedBooks < relatedBooks.length && (
                <LoadMoreButton onClick={handleLoadMore}>
                  {t('common.loadMore', 'Load more')}
                </LoadMoreButton>
              )}
            </>
          )}
        </RelatedSection>
      ) : null}
    </>
  );
};

export default BookDetails;
