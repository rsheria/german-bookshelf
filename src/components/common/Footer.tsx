import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiBook, FiHeadphones, FiUser, FiMail, FiGlobe, FiGithub, FiTwitter, FiInstagram } from 'react-icons/fi';
import theme from '../../styles/theme';

const FooterContainer = styled.footer`
  background-color: ${theme.colors.primary};
  color: white;
  padding: ${theme.spacing.xl} 0;
  width: 100%;
  position: relative;
  z-index: 10;
  margin-top: auto;
  
  body[data-theme='dark'] & {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${theme.spacing.xl};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.xl};
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    padding: 0 ${theme.spacing.lg};
    gap: ${theme.spacing.lg};
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    padding: 0 ${theme.spacing.md};
  }
`;

const FooterSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const FooterTitle = styled.h3`
  color: white;
  font-size: ${theme.typography.fontSize.lg};
  margin-bottom: ${theme.spacing.md};
  font-weight: ${theme.typography.fontWeight.bold};
  position: relative;
  display: inline-block;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 40px;
    height: 3px;
    background-color: ${theme.colors.secondary};
    border-radius: ${theme.borderRadius.full};
  }
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.text};
    
    &::after {
      background-color: ${({ theme }) => theme.colors.secondary};
    }
  }
`;

const FooterLink = styled(Link)`
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  margin-bottom: ${theme.spacing.sm};
  transition: color 0.3s ease, transform 0.3s ease;
  
  svg {
    margin-right: ${theme.spacing.sm};
  }
  
  &:hover {
    color: ${theme.colors.secondary};
    transform: translateX(5px);
  }
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.textLight};
    
    &:hover {
      color: ${({ theme }) => theme.colors.secondary};
    }
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${theme.colors.secondary};
    transform: translateY(-3px);
  }
  
  body[data-theme='dark'] & {
    background-color: rgba(255, 255, 255, 0.05);
    color: ${({ theme }) => theme.colors.text};
    
    &:hover {
      background-color: ${({ theme }) => theme.colors.secondary};
      color: white;
    }
  }
`;

const Copyright = styled.div`
  text-align: center;
  padding-top: ${theme.spacing.xl};
  margin-top: ${theme.spacing.xl};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-size: ${theme.typography.fontSize.sm};
  grid-column: 1 / -1;
  
  body[data-theme='dark'] & {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <FooterTitle>{t('footer.quickLinks', 'Quick Links')}</FooterTitle>
          <FooterLink to="/"><FiBook /> {t('nav.home')}</FooterLink>
          <FooterLink to="/audiobooks"><FiHeadphones /> {t('nav.audiobooks')}</FooterLink>
          <FooterLink to="/ebooks"><FiBook /> {t('nav.ebooks')}</FooterLink>
          <FooterLink to="/book-requests"><FiMail /> {t('nav.bookRequests', 'Request Books')}</FooterLink>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>{t('footer.account', 'Account')}</FooterTitle>
          <FooterLink to="/login"><FiUser /> {t('nav.login')}</FooterLink>
          <FooterLink to="/signup"><FiUser /> {t('nav.signup')}</FooterLink>
          <FooterLink to="/profile"><FiUser /> {t('nav.profile')}</FooterLink>
        </FooterSection>
        
        <FooterSection>
          <FooterTitle>{t('footer.contact', 'Contact Us')}</FooterTitle>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: theme.spacing.md }}>
            {t('footer.contactText', 'Have questions or suggestions? Get in touch with us.')}
          </p>
          <SocialLinks>
            <SocialLink href="#" aria-label="Twitter">
              <FiTwitter />
            </SocialLink>
            <SocialLink href="#" aria-label="Instagram">
              <FiInstagram />
            </SocialLink>
            <SocialLink href="#" aria-label="GitHub">
              <FiGithub />
            </SocialLink>
            <SocialLink href="#" aria-label="Website">
              <FiGlobe />
            </SocialLink>
          </SocialLinks>
        </FooterSection>
        
        <Copyright>
          &copy; {currentYear} {t('app.title')}. {t('footer.copyright', 'All rights reserved.')}
        </Copyright>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
