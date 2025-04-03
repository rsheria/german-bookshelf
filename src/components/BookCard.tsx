import React from 'react';
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
`;

const Author = styled.p`
  margin: 0 0 ${theme.spacing.md} 0; 
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textLight};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
`;

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const { t } = useTranslation();
  const placeholderCover = 'https://via.placeholder.com/300x450?text=No+Cover';

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [15, -15]); 
  const rotateY = useTransform(x, [-100, 100], [-15, 15]); 

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left - rect.width / 2);
    y.set(event.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <CardWrapper
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
                <FiHeadphones size={14} /> {t('books.audiobook')}
              </>
            ) : (
              <>
                <FiBook size={14} /> {t('books.ebook')}
              </>
            )}
          </BookType>
          <Language>{book.language}</Language>
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
