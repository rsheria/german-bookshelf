import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import theme from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { FiMenu, FiX, FiSearch, FiUser, FiLogOut, FiBook, FiHeadphones, FiPlusCircle, FiHome, FiSettings, FiSun, FiMoon } from 'react-icons/fi';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const navVariants = {
  top: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primaryDark,
    boxShadow: 'none',
  },
  scrolled: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.primaryDark,
    boxShadow: theme.shadows.lg,
  }
};

const mobileMenuVariants = {
  closed: {
    x: "100%",
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
  open: {
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 30, staggerChildren: 0.07, delayChildren: 0.2 }
  }
};

const mobileLinkVariants = {
  closed: { opacity: 0, x: 50 },
  open: { opacity: 1, x: 0 }
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const NavContainer = styled(motion.nav)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: ${theme.spacing.xl};
  padding-right: ${theme.spacing.xl};
  color: white;
  position: sticky;
  top: 0;
  z-index: ${theme.zIndex.sticky};
  
  @media (max-width: 1024px) {
    padding-left: ${theme.spacing.lg};
    padding-right: ${theme.spacing.lg};
  }
  
  @media (max-width: 768px) {
    padding-left: ${theme.spacing.md};
    padding-right: ${theme.spacing.md};
  }
`;

const Logo = styled(motion(Link))`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  font-family: ${theme.typography.fontFamily.heading};
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  
  @media (max-width: 768px) {
    font-size: ${theme.typography.fontSize.lg};
  }
`;

const NavLinks = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};

  &.desktop-navlinks {
    @media (max-width: 768px) {
      display: none !important; /* Override inline style */
    }
  }

  &.mobile-navlinks {
    display: none; /* Hide by default */
    
    @media (max-width: 768px) {
      display: flex; /* Will be shown via framer-motion */
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: min(300px, 80vw); /* Responsive width */
      flex-direction: column;
      background-color: ${theme.colors.primaryDark};
      padding: ${theme.spacing.xl} ${theme.spacing.lg};
      padding-top: ${theme.spacing['3xl']};
      z-index: ${theme.zIndex.modal};
      box-shadow: ${theme.shadows.xl};
      overflow-y: auto;
    }
  }
`;

const activeStyles = css`
  background-color: ${theme.colors.secondary};
  color: ${theme.colors.primaryDark};
  font-weight: ${theme.typography.fontWeight.bold};
`;

const NavLinkStyled = styled(motion(Link))<{ $isActive?: boolean }>`
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  position: relative;
  overflow: hidden;
  
  ${props => props.$isActive && activeStyles}

  @media (max-width: 1024px) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.typography.fontSize.sm};
    gap: ${theme.spacing.xs};
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: ${theme.spacing.md} ${theme.spacing.lg};
    margin-bottom: ${theme.spacing.sm};
    font-size: ${theme.typography.fontSize.md};
  }
`;

const SearchBar = styled(motion.div)`
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.full};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin-right: ${theme.spacing.md};
  border: 1px solid transparent;
  transition: background-color ${theme.transitions.fast}, border-color ${theme.transitions.fast};

  &:focus-within {
    background-color: rgba(255, 255, 255, 0.2);
    border-color: ${theme.colors.secondaryLight};
    box-shadow: ${theme.shadows.outline};
  }

  @media (max-width: 1024px) {
    margin-right: ${theme.spacing.sm};
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
  }

  @media (max-width: 768px) {
    width: 100%;
    margin: ${theme.spacing.lg} 0;
    order: -1;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: white;
  outline: none;
  width: 180px;
  font-family: ${theme.typography.fontFamily.body};
  font-size: ${theme.typography.fontSize.sm};
  padding-left: ${theme.spacing.sm};

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  @media (max-width: 1024px) {
    width: 140px;
  }

  @media (max-width: 768px) {
    width: 100%;
    font-size: ${theme.typography.fontSize.md};
  }
`;

const IconWrapper = styled(motion.button)`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: ${theme.spacing.sm};

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 1024px) {
    padding: ${theme.spacing.xs};
    margin-left: ${theme.spacing.xs};
    font-size: 0.9rem;
  }
`;

const LanguageToggle = styled(IconWrapper)`
  min-width: 40px;
`;

const ThemeToggle = styled(IconWrapper)`
`;

const MenuButton = styled(motion.button)`
  background: none;
  border: none;
  color: white;
  font-size: 1.8rem;
  cursor: pointer;
  display: none;
  z-index: ${theme.zIndex.modal + 1};
  position: relative;

  @media (max-width: 768px) {
    display: block;
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  z-index: ${theme.zIndex.modal + 1};

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  z-index: ${theme.zIndex.modalBackdrop};
`;

const NavSection = styled(motion.div)`
  padding-top: ${theme.spacing.lg};
  margin-top: ${theme.spacing.lg};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;

  &:first-of-type {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
`;

const NavSectionTitle = styled.h3`
  color: rgba(255, 255, 255, 0.6);
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.semibold};
  margin-bottom: ${theme.spacing.md};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding-left: ${theme.spacing.lg};
`;

const MotionLink: React.FC<React.ComponentProps<typeof NavLinkStyled> & { children: React.ReactNode, to: string, onClick?: () => void }> = ({ children, ...props }) => {
  return (
    <NavLinkStyled
      {...props}
      variants={mobileLinkVariants}
      whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </NavLinkStyled>
  );
};

const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  const forceLogout = () => {
    console.log("Attempting emergency logout...");
    supabase.auth.signOut().catch(error => {
      console.error("Supabase sign out failed during force logout:", error);
    });

    if (typeof logout === 'function') {
      logout();
      console.log("AuthContext state cleared.");
    } else {
      console.warn("AuthContext logout function not available for immediate state clearing.");
    }

    try {
      localStorage.removeItem('sb-auth-token');
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      console.log("Browser storage cleared.");

      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
      console.log("Attempted to clear cookies.");

      if (document.cookie !== "") {
        console.warn("Some cookies might remain (possibly HttpOnly).");
      }
    } catch (e) {
      console.error("Failed to clear storage:", e);
    }

    window.location.href = '/login?force_clean=true';
  };

  const handleLogout = async () => {
    forceLogout();
  };

  const isActiveLink = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <>
      <NavContainer 
        animate={scrolled ? "scrolled" : "top"} 
        variants={navVariants}
        initial={false} // Don't animate initial load based on scroll
        transition={{ duration: 0.3, ease: "easeInOut" }} // Add transition spec
      >
        <Logo 
          to="/" 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <FiBook /> {t('app.title')}
        </Logo>

        <MenuButton 
           onClick={() => setIsOpen(!isOpen)}
           whileHover={{ scale: 1.1 }}
           whileTap={{ scale: 0.9 }}
         >
          {isOpen ? <FiX /> : <FiMenu />}
        </MenuButton>

        {/* Desktop Nav Links (Hidden on Mobile) */} 
        <NavLinks className="desktop-navlinks">
           {/* Search Bar moved inside for better layout control */} 
           <SearchBar layout>
             <FiSearch style={{ marginRight: theme.spacing.sm, color: 'rgba(255, 255, 255, 0.7)'}} />
             <form onSubmit={handleSearch} style={{ display: 'contents' }}>
               <SearchInput
                 type="text"
                 placeholder={t('nav.search')}
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </form>
           </SearchBar>

           <MotionLink to="/" $isActive={isActiveLink('/')}> <FiHome /> {t('nav.home')} </MotionLink>
           <MotionLink to="/audiobooks" $isActive={isActiveLink('/audiobooks')}> <FiHeadphones /> {t('nav.audiobooks')} </MotionLink>
           <MotionLink to="/ebooks" $isActive={isActiveLink('/ebooks')}> <FiBook /> {t('nav.ebooks')} </MotionLink>

           {user ? (
             <>
               <MotionLink to="/profile" $isActive={isActiveLink('/profile')}> <FiUser /> {t('nav.profile')} </MotionLink>
               <MotionLink to="/book-requests" $isActive={isActiveLink('/book-requests')}> <FiPlusCircle /> {t('nav.bookRequests', 'Request Books')} </MotionLink>
               {isAdmin && (
                 <MotionLink to="/admin" $isActive={isActiveLink('/admin')}> <FiSettings /> {t('nav.admin')} </MotionLink>
               )}
               {/* Use MotionLink for consistency, but it acts like a button */}
               <MotionLink to="#" onClick={handleLogout}> <FiLogOut /> {t('nav.logout')} </MotionLink>
             </>
           ) : (
             <>
               <MotionLink to="/login" $isActive={isActiveLink('/login')}> <FiUser /> {t('nav.login')} </MotionLink>
               <MotionLink to="/signup" $isActive={isActiveLink('/signup')}> <FiPlusCircle /> {t('nav.signup')} </MotionLink>
             </>
           )}

           <LanguageToggle onClick={toggleLanguage} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
             {i18n.language === 'de' ? 'EN' : 'DE'}
           </LanguageToggle>

           <ThemeToggle onClick={toggleTheme} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
             {isDark ? <FiSun /> : <FiMoon />}
           </ThemeToggle>
        </NavLinks>
      </NavContainer>

      {/* Mobile Menu (Animated with AnimatePresence) */} 
      <AnimatePresence>
        {isOpen && (
          <>
            <Overlay 
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setIsOpen(false)} 
            />
            <NavLinks 
              variants={mobileMenuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="mobile-navlinks"
            >
              <CloseButton
                onClick={() => setIsOpen(false)}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX />
              </CloseButton>

              <SearchBar layout>
                <FiSearch style={{ marginRight: theme.spacing.sm, color: 'rgba(255, 255, 255, 0.7)'}} />
                <form onSubmit={handleSearch} style={{ display: 'contents' }}>
                  <SearchInput
                    type="text"
                    placeholder={t('nav.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </form>
              </SearchBar>

              <NavSection variants={mobileLinkVariants}>
                <NavSectionTitle>{t('nav.sections')}</NavSectionTitle>
                <MotionLink to="/" $isActive={isActiveLink('/')} onClick={() => setIsOpen(false)}> <FiHome /> {t('nav.home')} </MotionLink>
                <MotionLink to="/audiobooks" $isActive={isActiveLink('/audiobooks')} onClick={() => setIsOpen(false)}> <FiHeadphones /> {t('nav.audiobooks')} </MotionLink>
                <MotionLink to="/ebooks" $isActive={isActiveLink('/ebooks')} onClick={() => setIsOpen(false)}> <FiBook /> {t('nav.ebooks')} </MotionLink>
              </NavSection>

              {user ? (
                <NavSection variants={mobileLinkVariants}>
                  <NavSectionTitle>{t('nav.account')}</NavSectionTitle>
                  <MotionLink to="/profile" $isActive={isActiveLink('/profile')} onClick={() => setIsOpen(false)}> <FiUser /> {t('nav.profile')} </MotionLink>
                  <MotionLink to="/book-requests" $isActive={isActiveLink('/book-requests')} onClick={() => setIsOpen(false)}> <FiPlusCircle /> {t('nav.bookRequests', 'Request Books')} </MotionLink>
                  {isAdmin && (
                    <MotionLink to="/admin" $isActive={isActiveLink('/admin')} onClick={() => setIsOpen(false)}> <FiSettings /> {t('nav.admin')} </MotionLink>
                  )}
                  <MotionLink to="#" onClick={() => { handleLogout(); setIsOpen(false); }}> <FiLogOut /> {t('nav.logout')} </MotionLink>
                </NavSection>
              ) : (
                <NavSection variants={mobileLinkVariants}>
                  <NavSectionTitle>{t('nav.account')}</NavSectionTitle>
                  <MotionLink to="/login" $isActive={isActiveLink('/login')} onClick={() => setIsOpen(false)}> <FiUser /> {t('nav.login')} </MotionLink>
                  <MotionLink to="/signup" $isActive={isActiveLink('/signup')} onClick={() => setIsOpen(false)}> <FiPlusCircle /> {t('nav.signup')} </MotionLink>
                </NavSection>
              )}

              <NavSection variants={mobileLinkVariants} style={{ marginTop: 'auto', paddingTop: theme.spacing.lg, display: 'flex', justifyContent: 'space-around' }}>
                <LanguageToggle onClick={toggleLanguage} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  {i18n.language === 'de' ? 'EN' : 'DE'}
                </LanguageToggle>

                <ThemeToggle onClick={toggleTheme} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  {isDark ? <FiSun /> : <FiMoon />}
                </ThemeToggle>
              </NavSection>

            </NavLinks>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
