import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  onToggleFilters?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onToggleFilters }) => {
  const { t } = useTranslation();
  const { filters, updateFilter } = useBookFilter();
  const [searchType, setSearchType] = useState<'general' | 'fullText'>('general');
  const [inputValue, setInputValue] = useState(filters.query);
  const [searchParams] = useSearchParams();

  // Update input value when filters change
  useEffect(() => {
    // Don't update input value if it's empty and we're on a metadata path
    const pathParts = window.location.pathname.split('/');
    const isOnMetadataPath = pathParts.length >= 4 && pathParts[1] === 'search';
    
    if (filters.query || !isOnMetadataPath) {
      console.log('SearchBar: Updating input value to match filter:', filters.query);
      setInputValue(filters.query);
    } else {
      console.log('SearchBar: Not updating empty input on metadata path');
    }
  }, [filters.query]);
  
  // Read query from URL parameters and handle metadata paths
  useEffect(() => {
    const queryParam = searchParams.get('query');
    // Check if we're on a metadata path (like /search/:field/:value)
    const pathParts = window.location.pathname.split('/');
    const isOnMetadataPath = pathParts.length >= 4 && pathParts[1] === 'search';
    
    if (isOnMetadataPath) {
      // On metadata path, don't interfere with the automatic search
      console.log('SearchBar detected metadata path, letting path parameters handle the search');
      // The input value will be set by the filter context
    } else if (queryParam) {
      // For regular search with query parameter
      setInputValue(queryParam);
    }
  }, [searchParams]);

  // Handle form submission for search
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Keep raw query in the field
    setInputValue(inputValue);
    
    // Check if we're on a metadata path
    const pathParts = window.location.pathname.split('/');
    const isOnMetadataPath = pathParts.length >= 4 && pathParts[1] === 'search';
    
    // Only update the query if we're not on a metadata path or if the user has modified the input
    if (!isOnMetadataPath || inputValue !== filters.query) {
      console.log('SearchBar: Updating query to:', inputValue);
      // Update base query
      updateFilter('query', inputValue);
      
      // Parse any field:value clauses
      parseAdvancedSearchQuery(inputValue);
    } else {
      console.log('SearchBar: Not updating query because we are on a metadata path and input matches current filter');
    }
  };

  // New: parses field:value and applies filters
  const parseAdvancedSearchQuery = (query: string) => {
    const matches = query.match(/(\w+):(?:"([^"]+)"|([^\s]+))/g);
    if (!matches) return;

    matches.forEach(match => {
      const [field, ...valueParts] = match.split(':');
      let value = valueParts.join(':');

      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      switch (field.toLowerCase()) {
        case 'publisher':
          // (You’ll need to add publisher to your FilterContext if you want real filtering)
          console.log('Publisher filter:', value);
          break;
        case 'year':
          const year = parseInt(value, 10);
          if (!isNaN(year)) {
            updateFilter('yearFrom', year);
            updateFilter('yearTo', year);
          }
          break;
        case 'language':
          updateFilter('language', value);
          break;
        case 'format':
          updateFilter('fileType', value);
          break;
        case 'genre':
        case 'category':
          console.log('Genre/Category filter:', value);
          break;
        case 'narrator':
          console.log('Narrator filter:', value);
          break;
        default:
          // unknown field: leave it in the base query
          break;
      }
    });
  };

  const handleSearchTypeChange = (type: 'general' | 'fullText') => {
    setSearchType(type);
    // optionally: updateFilter('searchType', type);
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
          placeholder={t('search.placeholder', 'Search for title, author, ISBN, publisher...')}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
        />
        <SearchButton type="submit" id="search-button">
          {t('search.button', 'Search')}
        </SearchButton>
      </SearchForm>
      
      {onToggleFilters && (
        <OptionsLink onClick={onToggleFilters} type="button">
          {t('search.options', 'Search options')}
        </OptionsLink>
      )}
    </SearchContainer>
  );
};
