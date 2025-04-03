import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiSearch, FiChevronRight, FiBookOpen, FiBook, FiHeadphones, FiGlobe } from 'react-icons/fi';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadFull } from "tsparticles"; 
import type { Engine } from "@tsparticles/engine"; 
import Button from '../components/common/Button';
import theme from '../styles/theme';
import BookGrid from '../components/BookGrid';
import { useBooks } from '../hooks/useBooks';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.3,
      when: "beforeChildren" 
    } 
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};

// Particles configuration
const particlesOptions = {
  background: {
    color: {
      value: "transparent",
    },
  },
  fpsLimit: 60,
  particles: {
    color: {
      value: "#ffffff",
    },
    links: {
      color: "#ffffff",
      distance: 150,
      enable: true,
      opacity: 0.2,
      width: 1,
    },
    move: {
      direction: "none" as const,
      enable: true,
      outModes: {
        default: "bounce" as const,
      },
      random: true,
      speed: 1,
      straight: false,
    },
    number: {
      density: {
        enable: true,
        area: 800,
      },
      value: 50,
    },
    opacity: {
      value: 0.4,
    },
    shape: {
      type: "circle" as const,
    },
    size: {
      value: { min: 1, max: 3 },
    },
  },
  detectRetina: true,
};

// Styled Components
const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
`;

const HeroSection = styled(motion.div)`
  position: relative;
  height: 85vh;
  max-height: 800px;
  min-height: 500px;
  background-color: ${theme.colors.primary};
  color: white;
  overflow: hidden;
  z-index: 1;
`;

const ParticlesContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 100%;
  padding: ${theme.spacing['3xl']} ${theme.spacing.xl};
`;

const HeroTitle = styled(motion.h1)`
  font-size: clamp(2.5rem, 6vw, 4rem);
  margin-bottom: ${theme.spacing.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const HeroSubtitle = styled(motion.p)`
  font-size: clamp(1.1rem, 3vw, 1.5rem);
  margin-bottom: ${theme.spacing.xl};
  max-width: 800px;
  opacity: 0.9;
  line-height: 1.6;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const HeroActions = styled(motion.div)`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: 600px) {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
  }
`;

const ContentSection = styled.div`
  width: 100%;
  z-index: 2;
  background-color: ${props => props.theme.colors.background};
  position: relative;
  padding: ${theme.spacing['3xl']} 0;
`;

const FeatureSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${theme.spacing.xl};
  max-width: 1200px;
  margin: 0 auto ${theme.spacing['3xl']};
  padding: 0 ${theme.spacing.xl};
  
  @media (max-width: 768px) {
    padding: 0 ${theme.spacing.lg};
  }
`;

const FeatureCard = styled.div`
  background-color: white;
  padding: ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.md};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  body[data-theme='dark'] & {
    background-color: ${({ theme }) => theme.colors.card};
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${theme.shadows.lg};
  }
`;

const FeatureIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: ${theme.colors.primaryLight};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.md};
  font-size: 1.8rem;
  
  body[data-theme='dark'] & {
    background-color: ${({ theme }) => theme.colors.primaryLight};
  }
`;

const FeatureTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.primary};
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const FeatureDescription = styled.p`
  color: ${theme.colors.textLight};
  line-height: 1.6;
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const HomeSection = styled.div`
  max-width: 1200px;
  margin: 0 auto ${theme.spacing['3xl']};
  padding: 0 ${theme.spacing.xl};
  
  @media (max-width: 768px) {
    padding: 0 ${theme.spacing.lg};
  }
`;

const ViewAllLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  color: ${theme.colors.accent};
  font-weight: ${theme.typography.fontWeight.medium};
  transition: color 0.3s ease, transform 0.3s ease;
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.accent};
  }
  
  &:hover {
    color: ${theme.colors.secondaryDark};
    transform: translateX(5px);
    
    body[data-theme='dark'] & {
      color: ${({ theme }) => theme.colors.secondaryDark};
    }
  }
  
  svg {
    transition: transform 0.3s ease;
  }
  
  &:hover svg {
    transform: translateX(5px);
  }
`;

// Main Component
const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [init, setInit] = useState(false);
  
  useEffect(() => {
    // Wait for component to mount before initializing particles
    // This prevents SSR issues and improves initial loading
    initParticlesEngine(async (engine: Engine) => {
      await loadFull(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);
  
  // Fetch books using existing hooks
  const { 
    books: latestAudiobooks, 
    isLoading: isLoadingAudiobooks, 
    error: audiobooksError 
  } = useBooks({
    type: 'audiobook',
    limit: 4
  });
  
  // Fetch latest ebooks
  const { 
    books: latestEbooks, 
    isLoading: isLoadingEbooks, 
    error: ebooksError 
  } = useBooks({
    type: 'ebook',
    limit: 4
  });

  return (
    <PageWrapper>
      <HeroSection initial="hidden" animate="visible" variants={containerVariants}>
        {init && (
          <ParticlesContainer>
            <Particles id="tsparticles" options={particlesOptions} />
          </ParticlesContainer>
        )}
        
        <HeroContent>
          <HeroTitle variants={itemVariants}>{t('app.title')}</HeroTitle>
          <HeroSubtitle variants={itemVariants}>{t('app.tagline')}</HeroSubtitle>
          <HeroActions variants={itemVariants}>
            <Button 
              leftIcon={<FiSearch />} 
              size="lg"
            >
              {t('home.exploreBooks', 'Explore Books')}
            </Button>
            <Button 
              leftIcon={<FiBookOpen />} 
              variant="outline" 
              size="lg"
            >
              {t('home.howItWorks', 'How It Works')}
            </Button>
          </HeroActions>
        </HeroContent>
      </HeroSection>
      
      <ContentSection>
        <FeatureSection>
          <FeatureCard>
            <FeatureIcon>
              <FiHeadphones />
            </FeatureIcon>
            <FeatureTitle>{t('home.features.audiobooks.title', 'Premium Audiobooks')}</FeatureTitle>
            <FeatureDescription>
              {t('home.features.audiobooks.description', 'Listen to high-quality German audiobooks narrated by native speakers to improve your pronunciation and listening skills.')}
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <FiBook />
            </FeatureIcon>
            <FeatureTitle>{t('home.features.ebooks.title', 'Extensive E-Book Collection')}</FeatureTitle>
            <FeatureDescription>
              {t('home.features.ebooks.description', 'Access a vast library of German e-books across various genres and difficulty levels to enhance your reading skills.')}
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <FiGlobe />
            </FeatureIcon>
            <FeatureTitle>{t('home.features.learning.title', 'Language Learning')}</FeatureTitle>
            <FeatureDescription>
              {t('home.features.learning.description', 'Immerse yourself in authentic German content and accelerate your language learning journey with our carefully curated collection.')}
            </FeatureDescription>
          </FeatureCard>
        </FeatureSection>
        
        <HomeSection>
          <BookGrid 
            books={latestAudiobooks} 
            isLoading={isLoadingAudiobooks} 
            error={audiobooksError}
            title={t('nav.audiobooks')}
            subtitle={t('home.latestAudiobooks', 'Discover our latest German audiobooks to improve your listening skills')}
          />
          <div style={{ textAlign: 'center', marginTop: theme.spacing.md }}>
            <ViewAllLink to="/audiobooks">
              {t('common.viewAll')} <FiChevronRight />
            </ViewAllLink>
          </div>
        </HomeSection>
        
        <HomeSection>
          <BookGrid 
            books={latestEbooks} 
            isLoading={isLoadingEbooks} 
            error={ebooksError}
            title={t('nav.ebooks')}
            subtitle={t('home.latestEbooks', 'Explore our newest German e-books for all reading levels')}
          />
          <div style={{ textAlign: 'center', marginTop: theme.spacing.md }}>
            <ViewAllLink to="/ebooks">
              {t('common.viewAll')} <FiChevronRight />
            </ViewAllLink>
          </div>
        </HomeSection>
      </ContentSection>
    </PageWrapper>
  );
};

export default HomePage;
