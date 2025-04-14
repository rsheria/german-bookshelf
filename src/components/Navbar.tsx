import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import theme from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { FiMenu, FiX, FiSearch, FiUser, FiLogOut, FiBook, FiHeadphones, FiPlusCircle, FiSettings, FiSun, FiMoon } from 'react-icons/fi';

// Define variants for navbar animations
const navVariants = {
  top: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: 'rgba(45, 84, 112, 0.9)', // Semi-transparent primary color
    boxShadow: 'none',
  },
  scrolled: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    backgroundColor: '#2D5470', // Use primary color directly to avoid dark/light theme issues
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  }
};

// Define variants for mobile navigation
const mobileMenuVariants = {
  closed: {
    x: "100%",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 40,
    },
  },
  open: {
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 40,
      staggerChildren: 0.07,
      delayChildren: 0.2,
    },
  },
};

const mobileLinkVariants = {
  closed: { opacity: 0, y: 20 },
  open: { opacity: 1, y: 0 },
};

const NavContainer = styled(motion.nav)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: ${({ theme }) => theme.spacing.xl};
  padding-right: ${({ theme }) => theme.spacing.xl};
  color: white;
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  background-color: ${({ theme }) => theme.colors.primary};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  @media (max-width: 1024px) {
    padding-left: ${({ theme }) => theme.spacing.lg};
    padding-right: ${({ theme }) => theme.spacing.lg};
  }
  
  @media (max-width: 768px) {
    padding-left: ${({ theme }) => theme.spacing.md};
    padding-right: ${({ theme }) => theme.spacing.md};
  }
`;

const Logo = styled(Link)`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: 'Playfair Display, serif';
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  position: relative;
  z-index: 1;
  transform-origin: left;
  transition: transform 0.3s ease;
  
  /* Text will be hidden */
  color: transparent;
  
  /* Add a glow effect */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(ellipse at center, rgba(251, 245, 183, 0.2) 0%, rgba(251, 245, 183, 0) 70%);
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: scale(1.05);
    
    &::before {
      opacity: 1;
    }
  }
  
  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
  }
`;

const GoldenText = styled.span`
  background: linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 5px rgba(251, 245, 183, 0.3), 0 0 10px rgba(251, 245, 183, 0.2);
  animation: shine 3s infinite linear;
  position: relative;
  z-index: 2;
  white-space: nowrap;
  
  @keyframes shine {
    0% {
      background-position: 0% center;
    }
    100% {
      background-position: 200% center;
    }
  }
  
  ${Logo}:hover & {
    animation: shine 1.5s infinite linear;
  }
`;

const NavGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  position: relative;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: -${({ theme }) => theme.spacing.md};
    height: 24px;
    width: 1px;
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const NavLinks = styled(motion.div)<{ className?: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xl};

  &.desktop-navlinks {
    @media (max-width: 768px) {
      display: none;
    }
  }
  
  &.mobile-navlinks {
    display: none;
    
    @media (max-width: 768px) {
      display: flex;
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: min(300px, 80vw); /* Responsive width */
      flex-direction: column;
      background-color: ${({ theme }) => theme.colors.primary};
      padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.lg};
      padding-top: ${({ theme }) => theme.spacing['3xl']};
      z-index: ${({ theme }) => theme.zIndex.modal};
      box-shadow: ${({ theme }) => theme.shadows.xl};
      overflow-y: auto;
    }
  }
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  position: relative;
  transition: all 0.3s ease;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin: 0 ${({ theme }) => theme.spacing.xs};
  
  /* Modern hover effect */
  &:hover {
    color: white;
    background-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    
    &::after {
      transform: scaleX(1);
    }
  }
  
  /* Active indicator - bottom bar */
  &::after {
    content: '';
    position: absolute;
    bottom: 7px;
    left: 15%;
    width: 70%;
    height: 3px;
    background-color: ${({ theme }) => theme.colors.secondary};
    transform: scaleX(0);
    transform-origin: center;
    transition: transform 0.3s ease;
    border-radius: ${({ theme }) => theme.borderRadius.full};
  }
  
  &.active {
    color: white;
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
    
    &::after {
      transform: scaleX(1);
      box-shadow: 0 0 8px ${({ theme }) => theme.colors.secondary};
    }
  }
`;

const MotionLink = ({ to, children, $isActive, onClick, ...rest }: { 
  to: string; 
  children: React.ReactNode; 
  $isActive?: boolean; 
  onClick?: () => void;
}) => {
  const { isDark } = useTheme();
  const themeObj = theme;
  
  return (
    <motion.div
      whileHover={{ scale: 1.05, backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }}
      whileTap={{ scale: 0.95 }}
      style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        color: $isActive ? ($isActive ? "#F3C775" : "white") : "rgba(255, 255, 255, 0.9)",
        textDecoration: 'none',
        fontWeight: $isActive ? themeObj.typography.fontWeight.semibold : themeObj.typography.fontWeight.normal,
        transition: `all ${themeObj.transitions.fast}`,
        borderRadius: themeObj.borderRadius.md,
        cursor: 'pointer'
      }}
      {...rest}
    >
      <Link 
        to={to} 
        onClick={onClick}
        style={{ 
          color: 'inherit', 
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
        }}
      >
        {children}
      </Link>
    </motion.div>
  );
};

const SearchBar = styled(motion.div)`
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: ${({ theme }) => theme.borderRadius.full};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  margin: 0 ${({ theme }) => theme.spacing.md};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  &:hover, &:focus-within {
    background-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    margin: ${({ theme }) => theme.spacing.md} 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: white;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }
  
  &:focus {
    outline: none;
  }
  
  @media (max-width: 1024px) {
    width: 140px;
  }

  @media (max-width: 768px) {
    width: 100%;
    font-size: ${({ theme }) => theme.typography.fontSize.md};
  }
`;

const LanguageToggle = styled(motion.button)`
  background-color: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  }
`;

const ThemeToggle = styled(motion.button)`
  background-color: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  cursor: pointer;
  margin-left: ${({ theme }) => theme.spacing.sm};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  }
  
  svg {
    font-size: 18px;
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: 24px;
  cursor: pointer;
  z-index: ${({ theme }) => theme.zIndex.modal + 1};
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }
`;

const MenuButton = styled(motion.button)`
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  z-index: ${({ theme }) => theme.zIndex.sticky + 1};
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.15);
    width: 40px;
    height: 40px;
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }
`;

const NavBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: ${({ theme }) => theme.zIndex.overlay};
`;

const NavSection = styled(motion.div)`
  padding-top: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  width: 100%;

  &:first-of-type {
    border-top: none;
    margin-top: 0;
  }
`;

const NavSectionTitle = styled.h3`
  color: rgba(255, 255, 255, 0.7);
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const NewBadge = styled.span`
  background-color: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.primary}; /* Dark text on light background works in both modes */
  font-size: 9px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  padding: 2px 6px;
  border-radius: 10px;
  z-index: 1;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark, toggleTheme } = useTheme();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'de' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      if (isOpen) {
        setIsOpen(false);
      }
    }
  };

  const forceLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      // Clear any stored tokens or user data from localStorage
      localStorage.removeItem('supabase.auth.token');
      
      // Clean up any other app state - this will depend on your app
      // For example, if you're using a state management library like Redux
      // you might need to dispatch an action to clear the user state
      
      // Redirect to home page or login page
      window.location.href = '/';
    } catch (error) {
      console.error('Force logout error:', error);
      
      // If the normal logout fails, try to clean up everything manually
      localStorage.clear();
      
      // Force a page reload to reset all app state
      window.location.href = '/';
    }
  };

  const handleLogout = async () => {
    forceLogout();
  };

  const NavItem: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    to: string; 
    onClick?: () => void;
    $isActive?: boolean;
  }> = ({ icon, label, to, onClick, $isActive }) => {
    return (
      <motion.div
        variants={mobileLinkVariants as any}
        whileHover={{ x: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <MotionLink 
          to={to} 
          onClick={onClick} 
          $isActive={$isActive}
        >
          {icon} {label}
        </MotionLink>
      </motion.div>
    );
  };

  return (
    <> 
      <NavContainer
        initial={false}
        animate={isScrolled ? "scrolled" : "top"}
        variants={navVariants as any}
      >
        <Logo to="/">
          <FiBook /> <GoldenText>{t('app.title', 'German Bookshelf')}</GoldenText>
        </Logo>

        <MenuButton 
          onClick={() => setIsOpen(true)} 
          whileHover={{ scale: 1.1 }} 
          whileTap={{ scale: 0.9 }}
        >
          <FiMenu />
        </MenuButton>
        
        <NavLinks className="desktop-navlinks">
          {/* Main navigation group */}
          <NavGroup>
            <StyledNavLink to="/audiobooks">
              <FiHeadphones /> {t('nav.audiobooks')}
            </StyledNavLink>
            
            <StyledNavLink to="/ebooks">
              <FiBook /> {t('nav.ebooks')}
            </StyledNavLink>
            
            <StyledNavLink to="/search">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiSearch /> {t('nav.advancedSearch', 'Advanced Search')} <NewBadge>{t('nav.new', 'New')}</NewBadge>
              </span>
            </StyledNavLink>
          </NavGroup>
          
          {/* User group with conditional rendering */}
          <NavGroup>
            {user ? (
              <>
                <StyledNavLink to="/profile">
                  <FiUser /> {t('nav.profile')}
                </StyledNavLink>
                
                <StyledNavLink to="/book-requests">
                  <FiPlusCircle /> {t('nav.bookRequests', 'Request Books')}
                </StyledNavLink>
                
                {isAdmin && (
                  <StyledNavLink to="/admin">
                    <FiSettings /> {t('nav.admin')}
                  </StyledNavLink>
                )}
                
                <StyledNavLink to="#" onClick={handleLogout}>
                  <FiLogOut /> {t('nav.logout')}
                </StyledNavLink>
              </>
            ) : (
              <>
                <StyledNavLink to="/login">
                  <FiUser /> {t('nav.login')}
                </StyledNavLink>
                
                <StyledNavLink to="/signup">
                  <FiPlusCircle /> {t('nav.signup')}
                </StyledNavLink>
              </>
            )}
          </NavGroup>
          
          {/* Settings group */}
          <NavGroup>
            <LanguageToggle onClick={toggleLanguage} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              {i18n.language === 'de' ? 'EN' : 'DE'}
            </LanguageToggle>
            
            <ThemeToggle 
              onClick={toggleTheme} 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <FiSun /> : <FiMoon />}
            </ThemeToggle>
          </NavGroup>
        </NavLinks>
      </NavContainer>

      {/* Mobile Menu (Animated with AnimatePresence) */} 
      <AnimatePresence>
        {isOpen && (
          <>
            <NavBackdrop 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)} 
            />
            <NavLinks 
              className="mobile-navlinks"
              as={motion.div}
              variants={mobileMenuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <CloseButton
                onClick={() => setIsOpen(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX />
              </CloseButton>

              <SearchBar layout>
                <FiSearch style={{ marginRight: '8px', color: 'rgba(255, 255, 255, 0.7)'}} />
                <form onSubmit={(e) => { 
                  handleSearch(e); 
                  setIsOpen(false);
                }} 
                style={{ display: 'contents' }}>
                  <SearchInput
                    type="text"
                    placeholder={t('nav.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              </SearchBar>

              <NavSection variants={mobileLinkVariants}>
                <NavSectionTitle>{t('nav.sections')}</NavSectionTitle>
                <NavItem icon={<FiHeadphones />} label={t('nav.audiobooks')} to="/audiobooks" onClick={() => setIsOpen(false)} />
                <NavItem icon={<FiBook />} label={t('nav.ebooks')} to="/ebooks" onClick={() => setIsOpen(false)} />
                <NavItem icon={<FiSearch />} label={t('nav.advancedSearch', 'Advanced Search')} to="/search" onClick={() => setIsOpen(false)} />
              </NavSection>

              {user ? (
                <NavSection variants={mobileLinkVariants}>
                  <NavSectionTitle>{t('nav.account')}</NavSectionTitle>
                  <NavItem icon={<FiUser />} label={t('nav.profile')} to="/profile" onClick={() => setIsOpen(false)} />
                  <NavItem icon={<FiPlusCircle />} label={t('nav.bookRequests', 'Request Books')} to="/book-requests" onClick={() => setIsOpen(false)} />
                  {isAdmin && (
                    <NavItem icon={<FiSettings />} label={t('nav.admin')} to="/admin" onClick={() => setIsOpen(false)} />
                  )}
                  <NavItem icon={<FiLogOut />} label={t('nav.logout')} to="#" onClick={async () => { await handleLogout(); setIsOpen(false); }} />
                </NavSection>
              ) : (
                <NavSection variants={mobileLinkVariants}>
                  <NavSectionTitle>{t('nav.account')}</NavSectionTitle>
                  <NavItem icon={<FiUser />} label={t('nav.login')} to="/login" onClick={() => setIsOpen(false)} />
                  <NavItem icon={<FiPlusCircle />} label={t('nav.signup')} to="/signup" onClick={() => setIsOpen(false)} />
                </NavSection>
              )}

              <NavSection variants={mobileLinkVariants} style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', justifyContent: 'space-around' }}>
                <LanguageToggle onClick={() => { toggleLanguage(); setIsOpen(false); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  {i18n.language === 'de' ? 'EN' : 'DE'}
                </LanguageToggle>

                <ThemeToggle 
                  onClick={() => { toggleTheme(); setIsOpen(false); }} 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
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
