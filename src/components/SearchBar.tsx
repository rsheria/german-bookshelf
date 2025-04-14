import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useBookFilter } from '../context/BookFilterContext';

const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
`;

const SearchForm = styled.form`
  display: flex;
  width: 100%;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background-color: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme }) => theme.colors.inputText};
  border: 1px solid ${({ theme }) => theme.colors.inputBorder};
  border-right: none;
  border-radius: ${({ theme }) => theme.borderRadius.md} 0 0 ${({ theme }) => theme.borderRadius.md};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.outline};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.inputPlaceholder};
  }
`;

const SearchButton = styled.button`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 0 ${({ theme }) => theme.borderRadius.md} ${({ theme }) => theme.borderRadius.md} 0;
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  transition: background-color ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryLight};
  }
  
  &:active {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  margin-top: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SearchTypeButton = styled.button<{ active: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme, active }) => active ? theme.colors.primary : theme.colors.backgroundAlt};
  color: ${({ theme, active }) => active ? 'white' : theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:first-child {
    border-radius: ${({ theme }) => theme.borderRadius.md} 0 0 ${({ theme }) => theme.borderRadius.md};
  }
  
  &:last-child {
    border-radius: 0 ${({ theme }) => theme.borderRadius.md} ${({ theme }) => theme.borderRadius.md} 0;
  }
  
  &:hover {
    background-color: ${({ theme, active }) => active ? theme.colors.primaryLight : theme.colors.border};
  }
`;

const OptionsLink = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.secondary};
  cursor: pointer;
  margin-top: ${({ theme }) => theme.spacing.md};
  text-align: left;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  
  /* Add a faint background that works in both light and dark modes */
  background-color: rgba(255, 255, 255, 0.05);
  
  &:hover {
    text-decoration: underline;
    color: ${({ theme }) => theme.colors.secondaryLight};
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.secondary}40;
  }
`;

interface SearchBarProps {
  onToggleFilters: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onToggleFilters }) => {
  const { t } = useTranslation();
  const { filters, updateFilter } = useBookFilter();
  const [searchType, setSearchType] = useState<'general' | 'fullText'>('general');
  const [inputValue, setInputValue] = useState(filters.query);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('query', inputValue);
  };
  
  const handleSearchTypeChange = (type: 'general' | 'fullText') => {
    setSearchType(type);
    // Here you could also update context if you want to track search type
  };
  
  return (
    <SearchContainer>
      <ToggleContainer>
        <SearchTypeButton 
          active={searchType === 'general'} 
          onClick={() => handleSearchTypeChange('general')}
          type="button"
        >
          {t('search.general', 'General Search')}
        </SearchTypeButton>
        <SearchTypeButton 
          active={searchType === 'fullText'} 
          onClick={() => handleSearchTypeChange('fullText')}
          type="button"
        >
          {t('search.fullText', 'Full-Text Search')}
        </SearchTypeButton>
      </ToggleContainer>
      
      <SearchForm onSubmit={handleSubmit}>
        <SearchInput 
          type="text" 
          placeholder={t('search.placeholder', 'Search for title, author, ISBN...')}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <SearchButton type="submit">{t('search.button', 'Search')}</SearchButton>
      </SearchForm>
      
      <OptionsLink onClick={onToggleFilters} type="button">
        {t('search.options', 'Search options')}
      </OptionsLink>
    </SearchContainer>
  );
};
