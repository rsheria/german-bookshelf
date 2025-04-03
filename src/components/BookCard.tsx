import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiHeadphones, FiBook } from 'react-icons/fi';
import { motion, useMotionValue, useTransform } from 'framer-motion'; 
import { Book } from '../types/supabase';
import theme from '../styles/theme'; 

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
const getRatingColor = (rating: number | undefined) => {
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
    boxShadow: theme.shadows.xl, 
    transition: { duration: 0.3, ease: "easeOut" }
  },
  initial: {
    scale: 1,
    boxShadow: theme.shadows.md, 
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
  border-radius: ${theme.borderRadius.lg}; 
  overflow: hidden;
  background-color: ${theme.colors.card};
  height: 100%;
  text-decoration: none;
  color: ${theme.colors.text};
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
    outline: ${theme.shadows.outline};
    outline-offset: 2px;
    border-radius: ${theme.borderRadius.lg}; 
  }
`;

const CoverContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 150%; 
  overflow: hidden;
  border-radius: ${theme.borderRadius.lg} ${theme.borderRadius.lg} 0 0; 
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
    transition: opacity ${theme.transitions.normal};
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
  transition: transform ${theme.transitions.slow}; 

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
  top: ${theme.spacing.md};
  right: ${theme.spacing.md};
  background-color: ${theme.colors.secondary}; 
  color: ${theme.colors.primaryDark}; 
  border-radius: ${theme.borderRadius.full};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.semibold};
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 3; 
  box-shadow: ${theme.shadows.sm};
  transform: translateZ(40px);
  
  @media (max-width: 1024px) {
    top: ${theme.spacing.sm};
    right: ${theme.spacing.sm};
    padding: ${'4px'} ${theme.spacing.xs};
    font-size: ${'0.65rem'};
    transform: translateZ(20px);
  }
  
  @media (max-width: 768px) {
    transform: translateZ(15px);
  }
`;

const Language = styled(motion.div)` 
  position: absolute;
  top: ${theme.spacing.md};
  left: ${theme.spacing.md};
  background-color: ${theme.colors.primary};
  color: white;
  border-radius: ${theme.borderRadius.full};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.semibold};
  z-index: 3; 
  box-shadow: ${theme.shadows.sm};
  transform: translateZ(40px);
  
  @media (max-width: 1024px) {
    top: ${theme.spacing.sm};
    left: ${theme.spacing.sm};
    padding: ${'4px'} ${theme.spacing.xs};
    font-size: ${'0.65rem'};
    transform: translateZ(20px);
  }
  
  @media (max-width: 768px) {
    transform: translateZ(15px);
  }
`;

const RatingBadge = styled(motion.div)<{ rating: number | undefined }>`
  position: absolute;
  bottom: ${theme.spacing.md};
  right: ${theme.spacing.md};
  background-color: ${props => getRatingColor(props.rating)};
  color: white;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.bold};
  z-index: 3;
  box-shadow: ${theme.shadows.sm};
  transform: translateZ(40px);
  
  @media (max-width: 1024px) {
    bottom: ${theme.spacing.sm};
    right: ${theme.spacing.sm};
    padding: ${'4px'} ${theme.spacing.xs};
    font-size: ${'0.65rem'};
    transform: translateZ(20px);
  }
  
  @media (max-width: 768px) {
    transform: translateZ(15px);
  }
`;

const BookInfo = styled(motion.div)` 
  padding: ${theme.spacing.lg}; 
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: ${theme.colors.card};
  border-radius: 0 0 ${theme.borderRadius.lg} ${theme.borderRadius.lg}; 
  position: relative;
  z-index: 2;
  transform: translateZ(10px);
  
  @media (max-width: 1024px) {
    padding: ${theme.spacing.md};
  }
  
  @media (max-width: 768px) {
    padding: ${theme.spacing.sm};
    transform: translateZ(5px);
  }
`;

const Title = styled.h3`
  margin: 0 0 ${theme.spacing.sm} 0; 
  font-family: ${theme.typography.fontFamily.heading};
  font-size: ${theme.typography.fontSize.lg}; 
  font-weight: ${theme.typography.fontWeight.semibold}; 
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: ${theme.colors.primaryDark};
  
  @media (max-width: 1024px) {
    font-size: ${theme.typography.fontSize.md};
    margin: 0 0 ${theme.spacing.xs} 0;
  }
  
  @media (max-width: 768px) {
    font-size: ${'0.7rem'};
    margin: 0 0 ${theme.spacing.xs} 0;
  }
`;

const Author = styled.p`
  margin: 0 0 ${theme.spacing.md} 0; 
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textLight};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  @media (max-width: 1024px) {
    font-size: ${theme.typography.fontSize.xs};
    margin: 0 0 ${theme.spacing.sm} 0;
  }
  
  @media (max-width: 768px) {
    font-size: ${'0.65rem'};
    margin: 0 0 ${theme.spacing.xs} 0;
  }
`;

const Genre = styled.span`
  display: inline-block;
  align-self: flex-start; 
  background-color: ${theme.colors.backgroundAlt};
  border-radius: ${theme.borderRadius.full};
  padding: ${theme.spacing.xs} ${theme.spacing.md}; 
  font-size: ${theme.typography.fontSize.xs};
  margin-top: auto; 
  color: ${theme.colors.primary};
  font-weight: ${theme.typography.fontWeight.medium};
  
  @media (max-width: 1024px) {
    padding: ${'4px'} ${theme.spacing.sm};
    font-size: ${'0.65rem'};
  }
`;

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const { t } = useTranslation();
  const placeholderCover = 'https://via.placeholder.com/300x450?text=No+Cover';
  const isMobile = useMediaQuery('(max-width: 768px)');
  
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
          {book.rating && (
            <RatingBadge 
              rating={book.rating}
              className={`rating-badge ${getRatingBadgeClass(book.rating)}`}
            >
              {book.rating.toFixed(1)}
            </RatingBadge>
          )}
        </CoverContainer>
        <BookInfo>
          <Title>{book.title}</Title>
          <Author>{book.author}</Author>
          <Genre>{book.genre}</Genre>
        </BookInfo>
      </Card>
    </CardWrapper>
  );
};

export default BookCard;
