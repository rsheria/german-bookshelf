import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiMenu, FiX, FiSearch, FiUser, FiLogOut, FiBook, FiHeadphones, FiPlusCircle } from 'react-icons/fi';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/supabase';

const NavContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #2c3e50;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
    width: 250px;
    flex-direction: column;
    background-color: #2c3e50;
    padding: 2rem;
    z-index: 100;
    transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(100%)')};
    transition: transform 0.3s ease-in-out;
  }
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin-right: 1rem;

  @media (max-width: 768px) {
    width: 100%;
    margin: 1rem 0;
  }
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  color: white;
  outline: none;
  width: 200px;

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

  @media (max-width: 768px) {
    display: block;
  }
`;

const LanguageToggle = styled.button`
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;

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
  z-index: 99;
`;

const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleLanguage = () => {
    const newLang = i18n.language === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <NavContainer>
        <Logo to="/">
          <FiBook /> {t('app.title')}
        </Logo>

        <MenuButton onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <FiX /> : <FiMenu />}
        </MenuButton>

        <NavLinks isOpen={isOpen}>
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

          <NavLink to="/audiobooks" onClick={() => setIsOpen(false)}>
            <FiHeadphones /> {t('nav.audiobooks')}
          </NavLink>

          <NavLink to="/ebooks" onClick={() => setIsOpen(false)}>
            <FiBook /> {t('nav.ebooks')}
          </NavLink>

          {user ? (
            <>
              <NavLink to="/profile" onClick={() => setIsOpen(false)}>
                <FiUser /> {t('nav.profile')}
              </NavLink>
              
              <NavLink to="/book-requests" onClick={() => setIsOpen(false)}>
                <FiPlusCircle /> {t('nav.bookRequests', 'Request Books')}
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin" onClick={() => setIsOpen(false)}>
                  {t('nav.admin')}
                </NavLink>
              )}

              <NavLink to="#" onClick={() => { handleLogout(); setIsOpen(false); }}>
                <FiLogOut /> {t('nav.logout')}
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={() => setIsOpen(false)}>
                {t('nav.login')}
              </NavLink>
              <NavLink to="/signup" onClick={() => setIsOpen(false)}>
                {t('nav.signup')}
              </NavLink>
            </>
          )}

          <LanguageToggle onClick={toggleLanguage}>
            {i18n.language === 'de' ? 'EN' : 'DE'}
          </LanguageToggle>
        </NavLinks>
      </NavContainer>
      <Overlay isOpen={isOpen} onClick={() => setIsOpen(false)} />
    </>
  );
};

export default Navbar;
