import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { FiBook, FiMail, FiPhone, FiMapPin, FiGlobe, FiHeart } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import theme from '../../styles/theme';

const FooterContainer = styled.footer`
  background-color: ${theme.colors.primary};
  color: white;
  padding: ${theme.spacing['2xl']} 0 ${theme.spacing.lg};
  margin-top: ${theme.spacing['3xl']};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -50px;
    left: 0;
    width: 100%;
    height: 50px;
    background-color: ${theme.colors.primary};
    clip-path: polygon(0 100%, 100% 100%, 100% 0, 50% 60%, 0 0);
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${theme.spacing.xl};
  padding: 0 ${theme.spacing.lg};
  
  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const FooterTitle = styled.h3`
  font-family: ${theme.typography.fontFamily.heading};
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing.md};
  position: relative;
  padding-bottom: ${theme.spacing.sm};
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 40px;
    height: 3px;
    background-color: ${theme.colors.secondary};
  }
`;

const FooterText = styled.p`
  margin-bottom: ${theme.spacing.md};
  line-height: ${theme.typography.lineHeight.relaxed};
  opacity: 0.9;
`;

const FooterLink = styled(Link)`
  color: white;
  text-decoration: none;
  margin-bottom: ${theme.spacing.sm};
  transition: all ${theme.transitions.fast};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  
  &:hover {
    color: ${theme.colors.secondary};
    transform: translateX(5px);
  }
`;

const ExternalLink = styled.a`
  color: white;
  text-decoration: none;
  margin-bottom: ${theme.spacing.sm};
  transition: all ${theme.transitions.fast};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  
  &:hover {
    color: ${theme.colors.secondary};
    transform: translateX(5px);
  }
`;

const FooterBottom = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: ${theme.spacing.xl};
  padding-top: ${theme.spacing.lg};
  text-align: center;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  font-size: ${theme.typography.fontSize.sm};
  opacity: 0.8;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  @media (max-width: 576px) {
    font-size: ${theme.typography.fontSize.xs};
  }
`;

const CreatedWithLove = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.sm};
  
  svg {
    color: ${theme.colors.error};
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
  
  svg {
    font-size: 2rem;
  }
  
  span {
    font-family: ${theme.typography.fontFamily.heading};
    font-size: ${theme.typography.fontSize.xl};
    font-weight: ${theme.typography.fontWeight.bold};
  }
`;

const IconRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.sm};
  
  svg {
    min-width: 18px;
  }
`;

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <Logo>
            <FiBook />
            <span>{t('app.title')}</span>
          </Logo>
          <FooterText>
            {t('footer.description', 'Your ultimate destination for German language e-books and audiobooks. Improve your language skills with our curated collection.')}
          </FooterText>
          <IconRow>
            <FiMail />
            <span>contact@germanbookshelf.com</span>
          </IconRow>
          <IconRow>
            <FiPhone />
            <span>+49 (0) 123 456789</span>
          </IconRow>
          <IconRow>
            <FiMapPin />
            <span>Berlin, Germany</span>
          </IconRow>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>{t('footer.quickLinks', 'Quick Links')}</FooterTitle>
          <FooterLink to="/">{t('nav.home')}</FooterLink>
          <FooterLink to="/audiobooks">{t('nav.audiobooks')}</FooterLink>
          <FooterLink to="/ebooks">{t('nav.ebooks')}</FooterLink>
          <FooterLink to="/book-requests">{t('nav.bookRequests', 'Request Books')}</FooterLink>
          <FooterLink to="/login">{t('nav.login')}</FooterLink>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>{t('footer.resources', 'Resources')}</FooterTitle>
          <FooterLink to="/privacy-policy">{t('footer.privacyPolicy', 'Privacy Policy')}</FooterLink>
          <FooterLink to="/terms-of-service">{t('footer.termsOfService', 'Terms of Service')}</FooterLink>
          <FooterLink to="/faq">{t('footer.faq', 'FAQ')}</FooterLink>
          <FooterLink to="/contact">{t('footer.contact', 'Contact Us')}</FooterLink>
          <FooterLink to="/about">{t('footer.about', 'About Us')}</FooterLink>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>{t('footer.partners', 'Partners')}</FooterTitle>
          <ExternalLink href="https://www.goethe.de/" target="_blank" rel="noopener noreferrer">
            <FiGlobe /> Goethe Institut
          </ExternalLink>
          <ExternalLink href="https://www.dw.com/" target="_blank" rel="noopener noreferrer">
            <FiGlobe /> Deutsche Welle
          </ExternalLink>
          <ExternalLink href="https://www.daad.de/" target="_blank" rel="noopener noreferrer">
            <FiGlobe /> DAAD
          </ExternalLink>
          <ExternalLink href="https://www.duden.de/" target="_blank" rel="noopener noreferrer">
            <FiGlobe /> Duden
          </ExternalLink>
        </FooterSection>
      </FooterContent>
      
      <FooterBottom>
        <p>© {currentYear} {t('app.title')} - {t('footer.allRightsReserved', 'All Rights Reserved')}</p>
        <CreatedWithLove>
          {t('footer.createdWith', 'Created with')} <FiHeart /> {t('footer.inGermany', 'in Germany')}
        </CreatedWithLove>
      </FooterBottom>
    </FooterContainer>
  );
};

export default Footer;
