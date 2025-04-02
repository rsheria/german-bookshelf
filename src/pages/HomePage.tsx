import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { FiHeadphones, FiBook, FiChevronRight } from 'react-icons/fi';
import BookGrid from '../components/BookGrid';
import { useBooks } from '../hooks/useBooks';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
`;

const Hero = styled.div`
  background: linear-gradient(135deg, #3498db, #2c3e50);
  color: white;
  padding: 3rem 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
`;

const HeroTitle = styled.h1`
  font-size: 2.5rem;
  margin: 0 0 1rem 0;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.2rem;
  max-width: 600px;
  margin: 0 auto;
  opacity: 0.9;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #3498db;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const Section = styled.section`
  margin-bottom: 3rem;
`;

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  
  // Fetch latest audiobooks
  const { 
    books: latestAudiobooks, 
    isLoading: isLoadingAudiobooks, 
    error: audiobooksError 
  } = useBooks({
    type: 'audiobook',
    limit: 6
  });
  
  // Fetch latest ebooks
  const { 
    books: latestEbooks, 
    isLoading: isLoadingEbooks, 
    error: ebooksError 
  } = useBooks({
    type: 'ebook',
    limit: 6
  });

  return (
    <Container>
      <Hero>
        <HeroTitle>{t('app.title')}</HeroTitle>
        <HeroSubtitle>{t('app.tagline')}</HeroSubtitle>
      </Hero>
      
      <Section>
        <SectionHeader>
          <SectionTitle>
            <FiHeadphones /> {t('nav.audiobooks')}
          </SectionTitle>
          <ViewAllLink to="/audiobooks">
            {t('common.viewAll')} <FiChevronRight />
          </ViewAllLink>
        </SectionHeader>
        
        <BookGrid 
          books={latestAudiobooks} 
          isLoading={isLoadingAudiobooks} 
          error={audiobooksError} 
        />
      </Section>
      
      <Section>
        <SectionHeader>
          <SectionTitle>
            <FiBook /> {t('nav.ebooks')}
          </SectionTitle>
          <ViewAllLink to="/ebooks">
            {t('common.viewAll')} <FiChevronRight />
          </ViewAllLink>
        </SectionHeader>
        
        <BookGrid 
          books={latestEbooks} 
          isLoading={isLoadingEbooks} 
          error={ebooksError} 
        />
      </Section>
    </Container>
  );
};

export default HomePage;
