import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiHeadphones, FiBook } from 'react-icons/fi';
import { Book } from '../types/supabase';

interface BookCardProps {
  book: Book;
}

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background-color: white;
  height: 100%;
  text-decoration: none;
  color: inherit;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  }
`;

const CoverContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 150%; /* 2:3 aspect ratio for book covers */
  overflow: hidden;
`;

const Cover = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const BookType = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const BookInfo = styled.div`
  padding: 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Author = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Genre = styled.span`
  display: inline-block;
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.8rem;
  margin-top: 0.5rem;
  color: #555;
`;

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const { t } = useTranslation();
  
  const placeholderCover = 'https://via.placeholder.com/300x450?text=No+Cover';

  return (
    <Card to={`/books/${book.id}`}>
      <CoverContainer>
        <Cover 
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
              <FiHeadphones /> {t('books.audiobook')}
            </>
          ) : (
            <>
              <FiBook /> {t('books.ebook')}
            </>
          )}
        </BookType>
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
