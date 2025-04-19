import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiHeadphones, FiBook } from 'react-icons/fi';
import { motion, useMotionValue, useTransform } from 'framer-motion'; 
import { Book } from '../types/supabase';
import { extractCategoryParts } from './CategorySidebar';

interface BookCardProps {
  book: Book;
}

// Helper function to determine rating badge class
const getRatingBadgeClass = (rating: number | undefined) => {
  if (!rating) return '';
  if (rating >= 8) return 'rating-high';
  if (rating >= 7) return 'rating-medium';
  return 'rating-low';
};

// Helper function to get background color based on rating
const getRatingColor = (rating: number | undefined, theme: any) => {
  if (!rating) return theme.colors.backgroundAlt;
  if (rating >= 8) return theme.colors.ratingHigh;
  if (rating >= 7) return theme.colors.ratingMedium;
  return theme.colors.ratingLow;
};

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

const cardVariants = {
  hover: {
    scale: 1.05, 
    boxShadow: '0 10px 15px rgba(46, 52, 64, 0.08), 0 4px 6px rgba(46, 52, 64, 0.04)', 
    transition: { duration: 0.3, ease: "easeOut" }
  },
  initial: {
    scale: 1,
    boxShadow: '0 2px 4px rgba(46, 52, 64, 0.08), 0 1px 2px rgba(46, 52, 64, 0.04)', 
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

const CardWrapper = styled(motion.div)`
  perspective: 1000px; 
  
  @media (max-width: 768px) {
    perspective: 600px; 
  }
  
  /* Ensure proper touch handling on mobile */
  @media (hover: none) {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
  }
`;

const Card = styled(motion(Link))`
  display: flex;
  flex-direction: column;
  border-radius: ${({ theme }) => theme.borderRadius.lg}; 
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.border};
  height: 100%;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  position: relative;
  transform-style: preserve-3d; 
  will-change: transform, box-shadow; 
  
  /* Ensure clickable on mobile */
  z-index: 1;
  -webkit-touch-callout: none;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: ${({ theme }) => theme.shadows.outline};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.borderRadius.lg}; 
  }
`;

const CoverContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 150%; 
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius.lg} ${({ theme }) => theme.borderRadius.lg} 0 0; 
  transform: translateZ(20px); 
  
  @media (max-width: 768px) {
    transform: translateZ(10px); 
  }

  &::after { 
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 60%,
      rgba(0, 0, 0, 0.4) 100%
    );
    opacity: 0.6;
    transition: opacity ${({ theme }) => theme.transitions.normal};
  }

  ${Card}:hover &::after {
    opacity: 0.2; 
  }
`;

const Cover = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${({ theme }) => theme.transitions.slow}; 

  ${Card}:hover & {
    transform: scale(1.1); 
  }
  
  @media (hover: none) {
    ${Card}:hover & {
      transform: none;
    }
  }
`;

const BookType = styled(motion.div)`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.secondary}; 
  color: ${({ theme }) => theme.colors.text}; /* Ensure text is readable in both themes */
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  z-index: 2;
  transform: translateZ(15px);
  box-shadow: ${({ theme }) => theme.shadows.md};
  
  svg {
    color: ${({ theme }) => theme.colors.text}; /* Icon color */
  }
  
  @media (max-width: 1024px) {
    padding: ${({ theme }) => theme.spacing.xs};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    transform: translateZ(20px);
  }
  
  @media (max-width: 768px) {
    transform: translateZ(15px);
  }
`;

const Language = styled(motion.div)`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  left: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white; /* Always white for best contrast on primary color */
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  box-shadow: ${({ theme }) => theme.shadows.md};
  z-index: 2;
  transform: translateZ(15px);
  
  @media (max-width: 1024px) {
    padding: ${({ theme }) => theme.spacing.xs};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    transform: translateZ(20px);
  }
  
  @media (max-width: 768px) {
    transform: translateZ(15px);
  }
`;

const RatingBadge = styled(motion.div)<{ rating: number | undefined }>`
  position: absolute;
  bottom: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  background-color: ${({ rating, theme }) => getRatingColor(rating, theme)};
  color: white; /* Always white for best contrast on rating colors */
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  box-shadow: ${({ theme }) => theme.shadows.md};
  
  &.rating-high {
    background-color: ${({ theme }) => theme.colors.ratingHigh};
  }
  
  &.rating-medium {
    background-color: ${({ theme }) => theme.colors.ratingMedium};
  }
  
  &.rating-low {
    background-color: ${({ theme }) => theme.colors.ratingLow};
  }
  
  z-index: 2;
  transform: translateZ(10px);
  
  @media (max-width: 1024px) {
    padding: ${({ theme }) => theme.spacing.md};
  }
  
  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing.sm};
    transform: translateZ(5px);
  }
`;

const AccessBadge = styled(motion.div)<{premium: boolean}>`
  position: absolute;
  bottom: ${({ theme }) => theme.spacing.md};
  left: ${({ theme }) => theme.spacing.md};
  background-color: ${props => props.premium ? props.theme.colors.warning : props.theme.colors.success};
  color: white;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  z-index: 2;
`;

const BookInfo = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.md};
  gap: ${({ theme }) => theme.spacing.xs};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.card};
  transform: translateZ(5px);
  height: 100%;
  position: relative;
  flex: 1;
  
  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing.sm};
    gap: ${({ theme }) => theme.spacing.xs};
  }
`;

const Title = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0; 
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg}; 
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.text};
  text-overflow: ellipsis;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  
  @media (max-width: 1024px) {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  }
  
  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  }
`;

const Author = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-overflow: ellipsis;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1; 
  -webkit-box-orient: vertical;
  
  @media (max-width: 1024px) {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
  }
  
  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
  }
`;

const GenreContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: auto;
`;

const Genre = styled.span`
  display: inline-block;
  background-color: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  padding: 2px 8px;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
  
  @media (max-width: 1024px) {
    padding: 2px 6px;
    font-size: 0.65rem;
    max-width: 80px;
  }
  
  @media (max-width: 768px) {
    max-width: 70px;
  }
`;

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const { t } = useTranslation();
  // Removed unused useTheme import
  const placeholderCover = 'https://via.placeholder.com/300x450?text=No+Cover';
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Compute book categories for display
  const categoryParts = useMemo(() => {
    let parts: string[] = [];
    if (book.categories && Array.isArray(book.categories)) {
      parts.push(...book.categories.flatMap((c: string) => extractCategoryParts(c)));
    }
    if (book.genre) {
      parts.push(...extractCategoryParts(book.genre));
    }
    // normalize & dedupe
    return Array.from(new Set(parts.map(p => p.trim().toLowerCase())));
  }, [book.categories, book.genre]);
  
  // Helper to translate or capitalize category labels
  const renderCategoryLabel = (cat: string) => {
    const key = `categories.${cat}`;
    const translated = t(key);
    return translated !== key ? translated : cat.replace(/\b\w/g, c => c.toUpperCase());
  };

  // Add a mock rating for testing based on book ID
  // This is just for visual testing and should be removed in production
  const mockRating = useMemo(() => {
    // Generate a consistent rating between 6.0 and 9.5 based on the book id
    const hash = book.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 6 + (hash % 35) / 10; // Gives a value between 6.0 and 9.5
  }, [book.id]);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Reduce rotation on mobile
  const rotateXAmount = isMobile ? 5 : 15;
  const rotateYAmount = isMobile ? 5 : 15;
  
  const rotateX = useTransform(y, [-100, 100], [rotateXAmount, -rotateXAmount]); 
  const rotateY = useTransform(x, [-100, 100], [-rotateYAmount, rotateYAmount]); 

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // Skip 3D effect on mobile (touch devices)
    if (window.matchMedia('(hover: none)').matches) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left - rect.width / 2);
    y.set(event.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  
  // Add a click handler to improve mobile experience
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) {
      // Find the link and programmatically click it
      const link = e.currentTarget.querySelector('a');
      if (link && link instanceof HTMLAnchorElement) {
        link.click();
      }
    }
  };

  return (
    <CardWrapper
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <Card 
        to={`/books/${book.id}`}
        style={{ rotateX, rotateY }} 
        variants={cardVariants}      
        initial="initial"           
        whileHover="hover"          
        whileTap={{ scale: 0.98 }}   
      >
        <CoverContainer>
          <Cover 
            src={book.cover_url || placeholderCover} 
            alt={`${book.title} cover`}
            loading="lazy" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = placeholderCover;
            }}
          />
          <BookType>
            {book.type === 'audiobook' ? (
              <>
                <FiHeadphones size={isMobile ? 10 : 14} /> {t('books.audiobook')}
              </>
            ) : (
              <>
                <FiBook size={isMobile ? 10 : 14} /> {t('books.ebook')}
              </>
            )}
          </BookType>
          <Language>{book.language}</Language>
          {/* Use the actual rating if available, otherwise use mock rating for testing */}
          <RatingBadge 
            rating={book.rating || mockRating}
            className={`rating-badge ${getRatingBadgeClass(book.rating || mockRating)}`}
          >
            {(book.rating || mockRating).toFixed(1)}
          </RatingBadge>
          <AccessBadge premium={book.premium_only}>
            {book.premium_only ? 'Premium only' : 'Free'}
          </AccessBadge>
        </CoverContainer>
        <BookInfo>
          <Title>{book.title}</Title>
          <Author>{book.author}</Author>
          {/* Render category tags in a horizontal row */}
          <GenreContainer>
            {categoryParts.slice(0, 3).map(cat => (
              <Genre key={cat} title={renderCategoryLabel(cat)}>{renderCategoryLabel(cat)}</Genre>
            ))}
            {categoryParts.length > 3 && (
              <Genre title={`${categoryParts.length - 3} more categories`}>+{categoryParts.length - 3}</Genre>
            )}
          </GenreContainer>
        </BookInfo>
      </Card>
    </CardWrapper>
  );
};

export default BookCard;
