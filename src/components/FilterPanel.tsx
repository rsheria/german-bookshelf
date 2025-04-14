import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useBookFilter } from '../context/BookFilterContext';

const FilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const FilterLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const FilterSelect = styled.select`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.card};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  min-width: 150px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.outline};
  }
  
  option {
    background-color: ${({ theme }) => theme.colors.card};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const YearInput = styled.input`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.card};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  width: 100px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.outline};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const Checkbox = styled.input`
  margin-right: ${({ theme }) => theme.spacing.sm};
  accent-color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
`;

const ResetButton = styled.button`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: none;
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  margin-left: auto;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primary};
    color: white;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const FilterPanel: React.FC = () => {
  const { t } = useTranslation();
  const { filters, updateFilter, resetFilters } = useBookFilter();
  
  const languageOptions = [
    { value: '', label: t('filter.allLanguages', 'All Languages') },
    { value: 'german', label: t('languages.german', 'German') },
    { value: 'english', label: t('languages.english', 'English') },
    { value: 'french', label: t('languages.french', 'French') },
    // Add more languages as needed
  ];
  
  const fileTypeOptions = [
    { value: '', label: t('filter.allFormats', 'All Formats') },
    { value: 'pdf', label: 'PDF' },
    { value: 'epub', label: 'EPUB' },
    { value: 'mobi', label: 'MOBI' },
    { value: 'mp3', label: 'MP3' },
    // Add more file types as needed
  ];
  
  const sortOptions = [
    { value: 'popularity', label: t('sort.mostPopular', 'Most Popular') },
    { value: 'latest', label: t('sort.recentlyAdded', 'Recently Added') },
    { value: 'title_asc', label: t('sort.titleAsc', 'Title (A-Z)') },
    { value: 'title_desc', label: t('sort.titleDesc', 'Title (Z-A)') },
    { value: 'year', label: t('sort.year', 'Publication Year') },
    { value: 'size_asc', label: t('sort.sizeAsc', 'File Size (Smallest)') },
    { value: 'size_desc', label: t('sort.sizeDesc', 'File Size (Largest)') }
  ];
  
  return (
    <FilterContainer>
      <FilterGroup>
        <FilterLabel>{t('filter.yearFrom', 'Year from')}</FilterLabel>
        <YearInput 
          type="number" 
          value={filters.yearFrom || ''} 
          onChange={(e) => updateFilter('yearFrom', e.target.value ? Number(e.target.value) : null)} 
          placeholder={t('filter.from', 'From')}
        />
      </FilterGroup>
      
      <FilterGroup>
        <FilterLabel>{t('filter.yearTo', 'Year to')}</FilterLabel>
        <YearInput 
          type="number" 
          value={filters.yearTo || ''} 
          onChange={(e) => updateFilter('yearTo', e.target.value ? Number(e.target.value) : null)} 
          placeholder={t('filter.to', 'To')}
        />
      </FilterGroup>
      
      <FilterGroup>
        <FilterLabel>{t('filter.language', 'Language')}</FilterLabel>
        <FilterSelect 
          value={filters.language || ''}
          onChange={(e) => updateFilter('language', e.target.value || null)}
        >
          {languageOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </FilterSelect>
      </FilterGroup>
      
      <FilterGroup>
        <FilterLabel>{t('filter.fileType', 'File Type')}</FilterLabel>
        <FilterSelect 
          value={filters.fileType || ''}
          onChange={(e) => updateFilter('fileType', e.target.value || null)}
        >
          {fileTypeOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </FilterSelect>
      </FilterGroup>
      
      <FilterGroup>
        <FilterLabel>{t('filter.bookType', 'Book Type')}</FilterLabel>
        <FilterSelect 
          value={filters.bookType}
          onChange={(e) => updateFilter('bookType', e.target.value as any)}
        >
          <option value="all">{t('filter.allTypes', 'All Types')}</option>
          <option value="ebook">{t('books.ebook', 'E-Book')}</option>
          <option value="audiobook">{t('books.audiobook', 'Audiobook')}</option>
          <option value="Hörbuch">{t('books.hörbuch', 'Hörbuch')}</option>
        </FilterSelect>
      </FilterGroup>
      
      <FilterGroup>
        <FilterLabel>{t('filter.sortBy', 'Sort By')}</FilterLabel>
        <FilterSelect 
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value as any)}
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </FilterSelect>
      </FilterGroup>
      
      <CheckboxContainer>
        <Checkbox 
          type="checkbox" 
          id="exactMatch" 
          checked={filters.exactMatch}
          onChange={(e) => updateFilter('exactMatch', e.target.checked)}
        />
        <FilterLabel htmlFor="exactMatch" style={{ marginBottom: 0, cursor: 'pointer' }}>
          {t('filter.exactMatch', 'Exact matching')}
        </FilterLabel>
      </CheckboxContainer>
      
      <ResetButton onClick={resetFilters}>
        {t('filter.reset', 'Reset Filters')}
      </ResetButton>
    </FilterContainer>
  );
};
