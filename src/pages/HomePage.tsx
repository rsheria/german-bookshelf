import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { FiHeadphones, FiBook, FiChevronRight, FiBookOpen, FiSearch, FiGlobe } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadFull } from "tsparticles"; 
import type { Engine } from "@tsparticles/engine"; 
import BookGrid from '../components/BookGrid';
import { useBooks } from '../hooks/useBooks';
import Button from '../components/common/Button';
import theme from '../styles/theme';

const particlesOptions = {
  background: {
    color: {
      value: theme.colors.primaryDark,
    },
  },
  fpsLimit: 60,
  interactivity: {
    events: {
      onClick: {
        enable: true,
        mode: "push",
      },
      onHover: {
        enable: true,
        mode: "repulse",
      },
      resize: { enable: true },
    },
    modes: {
      push: {
        quantity: 2,
      },
      repulse: {
        distance: 100,
        duration: 0.4,
      },
    },
  },
  particles: {
    color: {
      value: theme.colors.secondary,
    },
    links: {
      color: theme.colors.secondaryLight,
      distance: 150,
      enable: true,
      opacity: 0.3,
      width: 1,
    },
    collisions: {
      enable: false,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: {
        default: "bounce",
      },
      random: true,
      speed: 1.5,
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
      type: "circle",
    },
    size: {
      value: { min: 1, max: 3 },
    },
  },
  detectRetina: true,
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
};

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.md};
`;

const Hero = styled(motion.div)` 
  color: white;
  padding: ${theme.spacing['3xl']} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.xl}; 
  margin-bottom: ${theme.spacing['2xl']};
  text-align: center;
  position: relative; 
  overflow: hidden; 
  z-index: ${theme.zIndex.base}; 
`;

const ParticlesContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1; 
`;

const HeroContent = styled(motion.div)` 
  position: relative; 
  z-index: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-size: ${theme.typography.fontSize['5xl']};
  font-family: ${theme.typography.fontFamily.heading};
  font-weight: ${theme.typography.fontWeight.bold};
  margin: 0 0 ${theme.spacing.md} 0;
  position: relative;
  display: inline-block;
  color: white; 

  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 4px;
    background: ${theme.colors.secondary}; 
    border-radius: ${theme.borderRadius.full};
  }

  @media (max-width: 768px) {
    font-size: ${theme.typography.fontSize['3xl']};
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: ${theme.typography.fontSize.xl};
  max-width: 700px;
  margin: ${theme.spacing.lg} auto;
  opacity: 0.9;
  line-height: ${theme.typography.lineHeight.relaxed};
  color: ${theme.colors.background}; 

  @media (max-width: 768px) {
    font-size: ${theme.typography.fontSize.lg};
  }
`;

const HeroActions = styled(motion.div)` 
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin-top: ${theme.spacing.xl};
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const FeatureSection = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.xl};
  margin: ${theme.spacing['3xl']} 0;
  
  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.div`
  background-color: white;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.shadows.md};
  text-align: center;
  transition: all ${theme.transitions.normal};
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${theme.shadows.lg};
  }
`;

const FeatureIcon = styled.div`
  width: 70px;
  height: 70px;
  background-color: ${theme.colors.primaryLight};
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${theme.spacing.lg};
  
  svg {
    font-size: 30px;
  }
`;

const FeatureTitle = styled.h3`
  font-family: ${theme.typography.fontFamily.heading};
  font-size: ${theme.typography.fontSize.xl};
  color: ${theme.colors.primary};
  margin-bottom: ${theme.spacing.sm};
`;

const FeatureDescription = styled.p`
  color: ${theme.colors.textLight};
  line-height: ${theme.typography.lineHeight.relaxed};
`;

const HomeSection = styled.section`
  margin-bottom: ${theme.spacing['3xl']};
`;

const ViewAllLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.secondary};
  text-decoration: none;
  font-weight: ${theme.typography.fontWeight.semibold};
  transition: all ${theme.transitions.fast};
  
  &:hover {
    color: ${theme.colors.secondaryDark};
    transform: translateX(3px);
  }
`;

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadFull(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const { 
    books: latestAudiobooks, 
    isLoading: isLoadingAudiobooks, 
    error: audiobooksError 
  } = useBooks({
    type: 'audiobook',
    limit: 6
  });

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
      <Hero initial="hidden" animate="visible" variants={containerVariants}>
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
      </Hero>
      
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
    </Container>
  );
};

export default HomePage;
