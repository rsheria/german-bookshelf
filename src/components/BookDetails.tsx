import React, { useState, useEffect } from 'react';
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
import { ClickableMetadata } from './ClickableMetadata';  // ← new import

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
  color: ${({ theme }) => theme.colors.text};
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
  color: ${({ theme }) => theme.colors.text};
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
  color: ${({ theme }) => theme.colors.text};
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
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 14px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  transition: all 0.2s ease;
  background-color: rgba(0, 0, 0, 0.05);
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
    text-decoration: underline;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  &:focus {
    outline: 2px solid rgba(0, 0, 0, 0.5);
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

// ZLibrary-inspired, minimalist, neutral two-column metadata grid
const MetadataGrid = styled.div.attrs({ className: 'force-dark-metadata' })`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0px 36px;
  background: ${({ theme }) => theme.mode === 'dark' ? '#23272f' : 'transparent'};
  border-radius: 16px;
  border: ${({ theme }) => theme.mode === 'dark' ? '1.5px solid #2d3748' : 'none'};
  margin: 2.2rem auto 2.2rem auto;
  max-width: 820px;
  padding: ${({ theme }) => theme.mode === 'dark' ? '26px 22px' : '0'};
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 2px 12px rgba(20,20,30,0.18)' : 'none'};
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

const MetadataRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 13px;
`;

const MetadataLabel = styled.div`
  min-width: 110px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f1f1f1 !important' : '#374151'};
  font-size: 15px;
  font-weight: ${({ theme }) => theme.mode === 'dark' ? '700 !important' : '600'};
  text-align: left;
  margin-right: 10px;
  letter-spacing: 0.01em;
  opacity: 1 !important;
`;

const MetadataArrow = styled.span`
  display: inline-block;
  margin: 0 10px 0 2px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#fff !important' : '#9ca3af'};
  font-size: 1.12em;
  font-weight: 700;
  vertical-align: middle;
  user-select: none;
`;

const MetadataValue = styled.div`
  color: ${({ theme }) => theme.mode === 'dark' ? '#fff !important' : '#222'};
  font-size: 15.5px;
  font-weight: ${({ theme }) => theme.mode === 'dark' ? '700 !important' : '500'};
  word-break: break-word;
  letter-spacing: 0.01em;
  opacity: 1 !important;
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
  background-color: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 150px;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background};
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
    border-color: ${({ theme }) => theme.colors.border};
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
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
    color: ${({ theme }) => theme.colors.text};
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
    color: ${({ theme }) => theme.colors.text};
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
  padding: ${({ theme }) =>theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
    transform: translateY(-2px);
    color: ${({ theme }) => theme.colors.text};
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
  color: ${({ theme }) => theme.colors.text};
`;

// Add styled tag for categories
const CategoryTag = styled(Link)`
  display: inline-block;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
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
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
  }
`;

function DarkModeMetadataStyleFix() {
  useEffect(() => {
    const id = 'force-dark-metadata-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = `
        body[data-theme='dark'] .force-dark-metadata div, 
        body[data-theme='dark'] .force-dark-metadata span {
          color: #fff !important;
          background: none !important;
          border: none !important;
          opacity: 1 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
  return null;
}

const BookDetails: React.FC<BookDetailsProps> = ({ book }) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { downloadBook, isLoading, error: hookError, remainingQuota, checkRemainingQuota } = useDownloads();
  const [localError, setLocalError] = useState<Error | null>(null);
  const displayedError = localError || hookError;
  const [showError, setShowError] = useState(false);
  const [bookRating, setBookRating] = useState<number | undefined>(book.rating);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [visibleRelatedBooks, setVisibleRelatedBooks] = useState(12);
  
  // Fetch related books
  const { relatedBooks, isLoading: relatedBooksLoading } = useRelatedBooks({
    bookId: book.id,
    limit: 12
  });
  
  const handleLoadMore = () => {
    setVisibleRelatedBooks(prev => Math.min(prev + 12, relatedBooks.length));
  };
  
  const handleDownload = async () => {
    if (!user) return;
    
    // Prevent free users from downloading premium-only books
    if (book.premium_only && profile?.subscription_plan !== 'premium') {
      const msg = t('books.premiumOnlyError','This is a premium-only book. Please upgrade to download.');
      setLocalError(new Error(msg));
      setShowError(true);
      return;
    }
    
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
  
  // Utility to extract publisher, year, edition from publisher string
  function parsePublisher(publisher: string, publishedDate?: string) {
    if (!publisher) return { name: '', edition: '', year: '' };
    let name = publisher;
    let edition = '';
    let year = '';
    const parts = publisher.split(';');
    if (parts.length > 1) {
      name = parts[0].trim();
      const rest = parts[1];
      const editionMatch = rest.match(/([0-9]+(st|nd|rd|th)? edition)/i);
      if (editionMatch) edition = editionMatch[1];
      const yearMatch = rest.match(/(19|20)\d{2}/);
      if (yearMatch) year = yearMatch[0];
    }
    if (!year && publishedDate) {
      const d = new Date(publishedDate);
      if (!isNaN(d.getTime())) year = d.getFullYear().toString();
    }
    return { name: name.replace(/;.*$/, '').trim(), edition, year };
  }

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
          <Author>
            <ClickableMetadata field="author" value={book.author} />
          </Author>
          
          <RatingContainer>
            {renderStarRating(book.rating || 0)}
            <RatingText>{(book.rating || 0).toFixed(1)}/5.0</RatingText>
            <CommentsCount>
              <FiUser />
              {t('ratings.title')}
            </CommentsCount>
          </RatingContainer>
          
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
          
          {book.publisher && (
            (() => {
              const { name, edition, year } = parsePublisher(book.publisher, book.published_date);
              const infoArr = [name];
              if (year) infoArr.push(year);
              if (edition) infoArr.push(edition);
              return (
                <PublisherInfo>
                  {infoArr.filter(Boolean).join(' • ')}
                </PublisherInfo>
              );
            })()
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
          
          {/* ZLibrary-inspired, minimalist, neutral two-column metadata grid */}
          <MetadataGrid>
            <div>
              {/* Fiction/Non-Fiction */}
              {book.fictionType && (
                <MetadataRow>
                  <MetadataLabel>{t('books.fictionType')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>
                    {(() => {
                      const key = `fictionType.${book.fictionType.toLowerCase()}`;
                      const localized = i18next.t(key);
                      return localized !== key ? localized : book.fictionType;
                    })()}
                  </MetadataValue>
                </MetadataRow>
              )}

              {/* Genre (clickable) */}
              {book.genre && (
                <MetadataRow>
                  <MetadataLabel>{t('books.genre')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>
                    {(() => {
                      const blacklist = ['kindle ebooks', 'kindle'];
                      let parts = book.genre
                        .replace(/Kindle eBooks/gi, '')
                        .split(/>|&|,/)
                        .map(p => p.trim())
                        .filter(Boolean)
                        .map(p => p.replace(/\(\d+\)$/g, '').trim().toLowerCase())
                        .filter((p, i, arr) => p && arr.indexOf(p) === i && !blacklist.includes(p));
                      
                      return parts.map((p, index) => {
                        const key = `categories.${p}`;
                        const localized = i18next.t(key);
                        const displayValue = localized !== key
                          ? localized
                          : p.replace(/\b\w/g, c => c.toUpperCase());
                          
                        return (
                          <React.Fragment key={p}>
                            {index > 0 && ', '}
                            <ClickableMetadata 
                              field="genre" 
                              value={p}
                              displayValue={displayValue}
                              multiple={true}
                            />
                          </React.Fragment>
                        );
                      });
                    })()}
                  </MetadataValue>
                </MetadataRow>
              )}

              {/* Publisher (clickable) */}
              {book.publisher && (
                <MetadataRow>
                  <MetadataLabel>{t('books.publisher')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>
                    <ClickableMetadata 
                      field="publisher" 
                      value={parsePublisher(book.publisher).name}
                    />
                  </MetadataValue>
                </MetadataRow>
              )}

              {/* Pages */}
              {book.page_count && (
                <MetadataRow>
                  <MetadataLabel>{t('books.pages')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>{book.page_count}</MetadataValue>
                </MetadataRow>
              )}

              {/* File Size */}
              {book.file_size && (
                <MetadataRow>
                  <MetadataLabel>{t('books.fileSize')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>{book.file_size}</MetadataValue>
                </MetadataRow>
              )}
            </div>

            <div>
              {/* Type */}
              <MetadataRow>
                <MetadataLabel>{t('books.type')}</MetadataLabel>
                <MetadataArrow>→</MetadataArrow>
                <MetadataValue>
                  {book.type === 'audiobook' ? t('books.audiobook') : t('books.ebook')}
                </MetadataValue>
              </MetadataRow>

              {/* File Formats (clickable) */}
              {(book.ebook_format || book.audio_format) && (
                <MetadataRow>
                  <MetadataLabel>{t('books.fileFormats', 'File Formats')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>
                    {book.type === 'audiobook'
                      ? book.audio_format && book.audio_format.split(',').map((format, index) => {
                          const formattedFormat = format.trim().toUpperCase();
                          return (
                            <React.Fragment key={format}>
                              {index > 0 && ', '}
                              <ClickableMetadata 
                                field="format" 
                                value={format.trim().toLowerCase()}
                                displayValue={formattedFormat}
                              />
                            </React.Fragment>
                          );
                        })
                      : book.ebook_format && book.ebook_format.split(',').map((format, index) => {
                          const formattedFormat = format.trim().toUpperCase();
                          return (
                            <React.Fragment key={format}>
                              {index > 0 && ', '}
                              <ClickableMetadata 
                                field="format" 
                                value={format.trim().toLowerCase()}
                                displayValue={formattedFormat}
                              />
                            </React.Fragment>
                          );
                        })
                    }
                  </MetadataValue>
                </MetadataRow>
              )}

              {/* Narrator (clickable) */}
              {book.type === 'audiobook' && book.narrator && (
                <MetadataRow>
                  <MetadataLabel>{t('books.narrator', 'Narrator')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>
                    <ClickableMetadata 
                      field="narrator" 
                      value={book.narrator}
                    />
                  </MetadataValue>
                </MetadataRow>
              )}

              {/* Audio Length */}
              {book.type === 'audiobook' && book.audio_length && (
                <MetadataRow>
                  <MetadataLabel>{t('books.audioLength', 'Length')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>{book.audio_length}</MetadataValue>
                </MetadataRow>
              )}

              {/* Year (clickable) */}
              {book.published_date && (
                <MetadataRow>
                  <MetadataLabel>{t('books.year')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>
                    <ClickableMetadata 
                      field="year" 
                      value={new Date(book.published_date).getFullYear().toString()}
                    />
                  </MetadataValue>
                </MetadataRow>
              )}

              {/* Language (clickable) */}
              <MetadataRow>
                <MetadataLabel>{t('books.language')}</MetadataLabel>
                <MetadataArrow>→</MetadataArrow>
                <MetadataValue>
                  <ClickableMetadata 
                    field="language" 
                    value={book.language}
                  />
                </MetadataValue>
              </MetadataRow>

              {/* ISBN */}
              {book.isbn && (
                <MetadataRow>
                  <MetadataLabel>ISBN</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>{book.isbn}</MetadataValue>
                </MetadataRow>
              )}

              {/* External ID */}
              {book.external_id && (
                <MetadataRow>
                  <MetadataLabel>{t('books.id')}</MetadataLabel>
                  <MetadataArrow>→</MetadataArrow>
                  <MetadataValue>{book.external_id}</MetadataValue>
                </MetadataRow>
              )}
            </div>
          </MetadataGrid>
          
          {/* Categories */}
          {book.categories && book.categories.length > 0 && (
            <div style={{ margin: '16px 0' }}>
              <MetadataLabel>{t('books.categories')}</MetadataLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(() => {
                  const blacklist = ['kindle ebooks', 'kindle'];
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
                    const localized = i18next.t(key);
                    const display = localized !== key ? localized : cat.replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <CategoryTag key={cat} to={`/category/${encodeURIComponent(cat)}`}>
                        {display}
                      </CategoryTag>
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
          
          {(showError || displayedError) && (
            <Alert>
              <FiAlertCircle />
              {displayedError?.message || t('books.downloadError')}
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
                    <Link to={`/books/${relatedBook.id}`}>
                      <RelatedBookCover 
                        src={relatedBook.cover_url || placeholderCover} 
                        alt={relatedBook.title}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = placeholderCover;
                        }}
                      />
                    </Link>
                    <RelatedBookTitle to={`/books/${relatedBook.id}`}>
                      {relatedBook.title}
                    </RelatedBookTitle>
                    <RelatedBookAuthor>{relatedBook.author}</RelatedBookAuthor>
                    <RelatedBookType>
                      {relatedBook.type === 'audiobook' ? (
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
      <DarkModeMetadataStyleFix />
    </>
  );
};

export default BookDetails;
