import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiHeadphones, FiBook } from 'react-icons/fi';
import { Book } from '../types/supabase';
import theme from '../styles/theme';

interface BookCardProps {
  book: Book;
}

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  border-radius: ${theme.borderRadius.md};
  overflow: hidden;
  box-shadow: ${theme.shadows.sm};
  transition: all ${theme.transitions.normal};
  background-color: ${theme.colors.card};
  height: 100%;
  text-decoration: none;
  color: ${theme.colors.text};
  position: relative;

  &:hover {
    transform: translateY(-5px) scale(1.02);
    box-shadow: ${theme.shadows.lg};
    
    .book-cover::after {
      opacity: 0.1;
    }
  }
  
  &:active {
    transform: translateY(-2px) scale(1.01);
    box-shadow: ${theme.shadows.md};
  }
`;

const CoverContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 150%; /* 2:3 aspect ratio for book covers */
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0.5) 100%
    );
    opacity: 0.3;
    transition: opacity ${theme.transitions.fast};
  }
`;

const Cover = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform ${theme.transitions.normal};
  
  ${Card}:hover & {
    transform: scale(1.05);
  }
`;

const BookType = styled.div`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  backdrop-filter: blur(4px);
  border-radius: ${theme.borderRadius.full};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 2;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`;

const Language = styled.div`
  position: absolute;
  top: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  background-color: ${theme.colors.primary};
  color: white;
  backdrop-filter: blur(4px);
  border-radius: ${theme.borderRadius.full};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  z-index: 2;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`;

const BookInfo = styled.div`
  padding: ${theme.spacing.md};
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: ${theme.colors.card};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -15px;
    left: 15px;
    right: 15px;
    height: 30px;
    background-color: ${theme.colors.card};
    border-radius: 50% 50% 0 0 / 100% 100% 0 0;
    z-index: 1;
  }
`;

const Title = styled.h3`
  margin: 0 0 ${theme.spacing.xs} 0;
  font-family: ${theme.typography.fontFamily.heading};
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: ${theme.colors.primary};
  position: relative;
  z-index: 2;
`;

const Author = styled.p`
  margin: 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textLight};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  z-index: 2;
`;

const Genre = styled.span`
  display: inline-block;
  background-color: ${theme.colors.backgroundAlt};
  border-radius: ${theme.borderRadius.full};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.xs};
  margin-top: ${theme.spacing.md};
  color: ${theme.colors.primary};
  font-weight: ${theme.typography.fontWeight.medium};
  position: relative;
  z-index: 2;
`;

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const { t } = useTranslation();
  
  const placeholderCover = 'https://via.placeholder.com/300x450?text=No+Cover';

  return (
    <Card to={`/books/${book.id}`}>
      <CoverContainer>
        <Cover 
          className="book-cover"
          src={book.cover_url || placeholderCover} 
          alt={`${book.title} cover`}
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
  );
};

export default BookCard;
