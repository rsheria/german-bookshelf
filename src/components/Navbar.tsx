import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import theme from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { FiMenu, FiX, FiSearch, FiUser, FiLogOut, FiBook, FiHeadphones, FiPlusCircle, FiHome, FiSettings, FiSun, FiMoon } from 'react-icons/fi';
import styled, { css } from 'styled-components';

const NavContainer = styled.nav<{ scrolled: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${props => props.scrolled ? '0.75rem 2rem' : '1.25rem 2rem'};
  background-color: ${theme.colors.primary};
  color: white;
  box-shadow: ${props => props.scrolled ? theme.shadows.md : 'none'};
  position: sticky;
  top: 0;
  z-index: ${theme.zIndex.sticky};
  transition: all ${theme.transitions.normal};
`;

const Logo = styled(Link)<{ scrolled?: boolean }>`
  font-size: ${props => props.scrolled ? '1.2rem' : '1.5rem'};
  font-weight: ${theme.typography.fontWeight.bold};
  font-family: ${theme.typography.fontFamily.heading};
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: font-size ${theme.transitions.fast}, transform ${theme.transitions.fast};
  
  &:hover {
    transform: scale(1.05);
  }
`;

const NavLinks = styled.div<{ isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 1.5rem;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: 280px;
    flex-direction: column;
    background-color: ${theme.colors.primary};
    padding: 2rem;
    z-index: ${theme.zIndex.modal};
    transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(100%)')};
    transition: transform ${theme.transitions.normal};
    box-shadow: ${theme.shadows.xl};
  }
`;

const activeStyles = css`
  background-color: rgba(255, 255, 255, 0.15);
  font-weight: ${theme.typography.fontWeight.bold};
  transform: translateY(-2px);
`;

const NavLink = styled(Link)<{ $isActive?: boolean }>`
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: ${theme.typography.fontWeight.medium};
  padding: 0.6rem 1rem;
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.fast};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 2px;
    background-color: white;
    transition: width ${theme.transitions.normal};
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    
    &::before {
      width: 80%;
    }
  }
  
  ${props => props.$isActive && activeStyles}

  @media (max-width: 768px) {
    width: 100%;
    padding: 0.8rem 1rem;
    margin-bottom: 0.5rem;
    
    &:hover {
      transform: translateX(5px);
    }
    
    ${props => props.$isActive && css`
      background-color: rgba(255, 255, 255, 0.15);
      transform: translateX(5px);
    `}
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: ${theme.borderRadius.full};
  padding: 0.5rem 1rem;
  margin-right: 1rem;
  transition: all ${theme.transitions.fast};
  border: 1px solid transparent;
  
  &:focus-within {
    background-color: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 768px) {
    width: 100%;
    margin: 1rem 0 1.5rem 0;
  }
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: white;
  outline: none;
  width: 200px;
  font-family: ${theme.typography.fontFamily.body};
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const MenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: transform ${theme.transitions.fast};
  
  &:hover {
    transform: rotate(90deg);
  }

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const LanguageToggle = styled.button`
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 0.8rem;
  border-radius: ${theme.borderRadius.full};
  cursor: pointer;
  font-weight: ${theme.typography.fontWeight.semibold};
  transition: all ${theme.transitions.fast};
  letter-spacing: 0.5px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ThemeToggle = styled.button`
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 0.8rem;
  border-radius: ${theme.borderRadius.full};
  cursor: pointer;
  margin-left: 0.5rem;
  transition: background-color ${theme.transitions.fast};

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const Overlay = styled.div<{ isOpen: boolean }>`
  display: ${({ isOpen }) => (isOpen ? 'block' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: ${theme.zIndex.dropdown};
  transition: opacity ${theme.transitions.fast};
  opacity: ${({ isOpen }) => (isOpen ? 1 : 0)};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: none;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const NavSection = styled.div`
  margin-bottom: 1.5rem;
  display: none;
  
  @media (max-width: 768px) {
    display: block;
    width: 100%;
  }
`;

const NavSectionTitle = styled.h3`
  color: rgba(255, 255, 255, 0.7);
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  // EMERGENCY LOGOUT FUNCTION - Works even when auth state is broken after refresh
  const forceLogout = () => {
    console.log("EMERGENCY LOGOUT: Forcibly clearing all auth state");
    
    try {
      // 1. Directly call Supabase signOut without going through context
      supabase.auth.signOut().catch(e => console.error("Supabase direct logout error:", e));
    } catch (e) {
      console.error("Failed direct Supabase logout:", e);
    }
    
    try {
      // 2. Clear ALL possible storage
      localStorage.clear(); // Clear everything in localStorage
      sessionStorage.clear();
      
      // 3. Clear specific auth-related items to be sure
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-session');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('user_is_admin');
      localStorage.removeItem('user_logged_in');
      
      // 4. Clear any Supabase-specific storage that could be causing issues
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error("Failed to clear storage:", e);
    }
    
    // 5. Force navigation to login page with special parameter to ensure clean state
    window.location.href = '/login?force_clean=true';
  };

  const handleLogout = async () => {
    // Use the emergency logout function to ensure it works even after refresh
    forceLogout();
  };

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      <NavContainer scrolled={scrolled}>
        <Logo to="/" scrolled={scrolled}>
          <FiBook /> {t('app.title')}
        </Logo>

        <MenuButton onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <FiX /> : <FiMenu />}
        </MenuButton>

        <NavLinks isOpen={isOpen}>
          <CloseButton onClick={() => setIsOpen(false)}>
            <FiX />
          </CloseButton>
          
          <NavSection>
            <NavSectionTitle>{t('nav.sections')}</NavSectionTitle>
          </NavSection>
          
          <form onSubmit={handleSearch}>
            <SearchBar>
              <FiSearch />
              <SearchInput
                type="text"
                placeholder={t('nav.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchBar>
          </form>

          <NavLink to="/" $isActive={isActiveLink('/')} onClick={() => setIsOpen(false)}>
            <FiHome /> {t('nav.home')}
          </NavLink>

          <NavLink to="/audiobooks" $isActive={isActiveLink('/audiobooks')} onClick={() => setIsOpen(false)}>
            <FiHeadphones /> {t('nav.audiobooks')}
          </NavLink>

          <NavLink to="/ebooks" $isActive={isActiveLink('/ebooks')} onClick={() => setIsOpen(false)}>
            <FiBook /> {t('nav.ebooks')}
          </NavLink>

          {user ? (
            <>
              <NavSection>
                <NavSectionTitle>{t('nav.account')}</NavSectionTitle>
              </NavSection>
              
              <NavLink to="/profile" $isActive={isActiveLink('/profile')} onClick={() => setIsOpen(false)}>
                <FiUser /> {t('nav.profile')}
              </NavLink>
              
              <NavLink to="/book-requests" $isActive={isActiveLink('/book-requests')} onClick={() => setIsOpen(false)}>
                <FiPlusCircle /> {t('nav.bookRequests', 'Request Books')}
              </NavLink>

              {isAdmin && (
                <>
                  <NavSection>
                    <NavSectionTitle>{t('nav.adminSection')}</NavSectionTitle>
                  </NavSection>
                  
                  <NavLink to="/admin" $isActive={location.pathname.includes('/admin')} onClick={() => setIsOpen(false)}>
                    <FiSettings /> {t('nav.admin')}
                  </NavLink>
                </>
              )}

              <NavLink to="#" onClick={() => { handleLogout(); setIsOpen(false); }}>
                <FiLogOut /> {t('nav.logout')}
              </NavLink>
            </>
          ) : (
            <>
              <NavSection>
                <NavSectionTitle>{t('nav.account')}</NavSectionTitle>
              </NavSection>
              
              <NavLink to="/login" $isActive={isActiveLink('/login')} onClick={() => setIsOpen(false)}>
                <FiUser /> {t('nav.login')}
              </NavLink>
              
              <NavLink to="/signup" $isActive={isActiveLink('/signup')} onClick={() => setIsOpen(false)}>
                <FiPlusCircle /> {t('nav.signup')}
              </NavLink>
            </>
          )}

          <LanguageToggle onClick={toggleLanguage}>
            {i18n.language === 'de' ? 'EN' : 'DE'}
          </LanguageToggle>

          <ThemeToggle onClick={toggleTheme}>
            {isDark ? <FiSun /> : <FiMoon />}
          </ThemeToggle>

        </NavLinks>
      </NavContainer>
      <Overlay isOpen={isOpen} onClick={() => setIsOpen(false)} />
    </>
  );
};

export default Navbar;
