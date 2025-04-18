import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiBook, FiHeadphones } from 'react-icons/fi';
import { getAllCategories, getCategoryStats } from '../services/categoryService';

const SidebarContainer = styled.div`
  width: 100%;
  max-width: 280px;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const SidebarHeader = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const TagList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const MainCategoryHeader = styled.div`
  background-color: #1e4c6a;
  color: white;
  padding: 12px 15px;
  margin: 0;
  font-weight: 600;
  font-size: 1em;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 8px;
  }
`;

const SubcategoryHeader = styled.div`
  background-color: #f5f5f5;
  color: #333;
  padding: 10px 15px;
  margin: 0;
  font-weight: 600;
  font-size: 0.95em;
  border-bottom: 1px solid #e0e0e0;
  border-top: 1px solid #e0e0e0;
`;

const CategoryItem = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`;

const CheckboxContainer = styled.div`
  width: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CategoryLabel = styled.label`
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
  font-size: 0.9em;
  
  input {
    cursor: pointer;
    margin-right: 0;
    width: 16px;
    height: 16px;
  }
`;

const CategoryText = styled.span`
  margin-left: 8px;
  flex-grow: 1;
`;

const CategoryCount = styled.span`
  color: #777;
  font-size: 0.85em;
  margin-left: 5px;
`;

const ClearAllButton = styled.button`
  margin-bottom: 16px;
  background: white;
  color: #1e4c6a;
  border: 1px solid #1e4c6a;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s;
  font-size: 0.9em;
  
  &:hover {
    background: #1e4c6a;
    color: white;
  }
`;

// --- UTILS: Category cleaning and splitting (matches what's stored in Supabase) ---

// Helper function to extract categories from genre string
export function extractCategoryParts(raw: string): string[] {
  if (!raw) return [];
  
  // Blacklist of terms to filter out
  const blacklist = [
    'kindle ebooks', 'kindle e-books', 'ebooks', 'kindle', 
    'fiction', 'non-fiction', 'nonfiction', 'non fiction'
  ];
  
  // Process the genre string to extract categories
  return raw
    .split(/>|&|,/) // Split only by hierarchy markers, not spaces
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => p.replace(/\(\d+\)$/g, '').trim().toLowerCase())
    .filter(p => p && p.length > 1 && !blacklist.includes(p));
}

function translateCategory(cat: string, t: (k: string) => string) {
  const key = `categories.${cat}`;
  const translated = t(key);
  return translated !== key ? translated : cat.replace(/\b\w/g, c => c.toUpperCase());
}

// --- MAIN SIDEBAR COMPONENT ---
interface CategorySidebarProps {
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({ 
  selectedCategories, 
  setSelectedCategories 
}) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [loading, setLoading] = useState(true);
  
  // Removing unused state variables
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchSidebarCategories = async () => {
      setLoading(true);
      try {
        // Fetch all categories from DB to respect blacklisting
        const tableCats = await getAllCategories(true);
        const blacklistMap = new Map(tableCats.map(c => [c.name, c.blacklisted]));
        // Fetch stats directly from books
        const stats = await getCategoryStats();
        // Initialize grouped structure
        const categorized: Record<string, Record<string, Record<string, number>>> = {
          'E-Books': { Fiction: {}, 'Non-Fiction': {} },
          'Audiobooks': { Fiction: {}, 'Non-Fiction': {} }
        };
        stats.forEach(s => {
          // Skip blacklisted categories
          if (blacklistMap.get(s.name)) return;
          const bookType = s.type === 'audiobook' ? 'Audiobooks' : 'E-Books';
          const ficType = s.fictionType === 'Fiction' ? 'Fiction' : 'Non-Fiction';
          categorized[bookType][ficType][s.name] = s.count;
        });
        setCategories(categorized);
        setError(null);
      } catch (err) {
        console.error('Error fetching sidebar categories:', err);
        setError(t('categories.error', 'Failed to load categories'));
      } finally {
        setLoading(false);
      }
    };
    fetchSidebarCategories();
  }, [t]);

  // --- RENDER ---
  if (loading) {
    return (
      <SidebarContainer>
        <SidebarHeader>{t('sidebar.categories', 'Categories')}</SidebarHeader>
        <div>{t('common.loading', 'Loading...')}</div>
      </SidebarContainer>
    );
  }

  if (error) {
    return (
      <SidebarContainer>
        <SidebarHeader>{t('sidebar.categories', 'Categories')}</SidebarHeader>
        <div>{error}</div>
      </SidebarContainer>
    );
  }

  return (
    <SidebarContainer>
      <SidebarHeader>{t('sidebar.categories', 'Categories')}</SidebarHeader>
      
      {selectedCategories.length > 0 && (
        <ClearAllButton onClick={() => setSelectedCategories([])}>
          Clear All
        </ClearAllButton>
      )}

      {/* E-Books main section */}
      <MainCategoryHeader>
        <FiBook /> 
        {typeof t('categories.ebooks') === 'string' && t('categories.ebooks') !== 'categories.ebooks' ? t('categories.ebooks') : 'E-Books'}
      </MainCategoryHeader>
      
      {/* Fiction section for E-Books */}
      <SubcategoryHeader>
        {typeof t('categories.fiction') === 'string' && t('categories.fiction') !== 'categories.fiction' ? t('categories.fiction') : 'Fiction'}
      </SubcategoryHeader>

      <TagList>
        {categories['E-Books']?.['Fiction'] && Object.entries(categories['E-Books']['Fiction']).map(([cat, count]) => {
          const isSelected = selectedCategories.includes(cat);
          const translatedCategory = cat; // You can add translation here if needed
          
          return (
            <CategoryItem key={cat}>
              <CheckboxContainer>
                <CategoryLabel>
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (isSelected) {
                        setSelectedCategories(selectedCategories.filter(c => c !== cat));
                      } else {
                        // Add to current selection rather than replacing
                        setSelectedCategories([...selectedCategories, cat]);
                      }
                    }}
                  />
                </CategoryLabel>
              </CheckboxContainer>
              <CategoryText onClick={() => {
                if (isSelected) {
                  setSelectedCategories(selectedCategories.filter(c => c !== cat));
                } else {
                  setSelectedCategories([...selectedCategories, cat]);
                }
              }}>
                {translatedCategory}
                <CategoryCount>({count})</CategoryCount>
              </CategoryText>
            </CategoryItem>
          );
        })}
      </TagList>

      {/* Non-Fiction section for E-Books */}
      <SubcategoryHeader>
        {typeof t('categories.nonFiction') === 'string' && t('categories.nonFiction') !== 'categories.nonFiction' ? t('categories.nonFiction') : 'Non-Fiction'}
      </SubcategoryHeader>

      <TagList>
        {categories['E-Books']?.['Non-Fiction'] && Object.entries(categories['E-Books']['Non-Fiction']).map(([cat, count]) => {
          const isSelected = selectedCategories.includes(cat);
          const translatedCategory = cat; // You can add translation here if needed
          
          return (
            <CategoryItem key={cat}>
              <CheckboxContainer>
                <CategoryLabel>
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (isSelected) {
                        setSelectedCategories(selectedCategories.filter(c => c !== cat));
                      } else {
                        // Add to current selection rather than replacing
                        setSelectedCategories([...selectedCategories, cat]);
                      }
                    }}
                  />
                </CategoryLabel>
              </CheckboxContainer>
              <CategoryText onClick={() => {
                if (isSelected) {
                  setSelectedCategories(selectedCategories.filter(c => c !== cat));
                } else {
                  setSelectedCategories([...selectedCategories, cat]);
                }
              }}>
                {translatedCategory}
                <CategoryCount>({count})</CategoryCount>
              </CategoryText>
            </CategoryItem>
          );
        })}
      </TagList>

      {/* Audiobooks main section */}
      <MainCategoryHeader style={{ marginTop: '20px' }}>
        <FiHeadphones /> 
        {typeof t('categories.audiobooks') === 'string' && t('categories.audiobooks') !== 'categories.audiobooks' ? t('categories.audiobooks') : 'Audiobooks'}
      </MainCategoryHeader>
      
      {/* Fiction section for Audiobooks */}
      <SubcategoryHeader>
        {typeof t('categories.fiction') === 'string' && t('categories.fiction') !== 'categories.fiction' ? t('categories.fiction') : 'Fiction'}
      </SubcategoryHeader>

      <TagList>
        {categories['Audiobooks']?.['Fiction'] && Object.entries(categories['Audiobooks']['Fiction']).map(([cat, count]) => {
          const isSelected = selectedCategories.includes(cat);
          const translatedCategory = cat; // You can add translation here if needed
          
          return (
            <CategoryItem key={cat}>
              <CheckboxContainer>
                <CategoryLabel>
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (isSelected) {
                        setSelectedCategories(selectedCategories.filter(c => c !== cat));
                      } else {
                        // Add to current selection rather than replacing
                        setSelectedCategories([...selectedCategories, cat]);
                      }
                    }}
                  />
                </CategoryLabel>
              </CheckboxContainer>
              <CategoryText onClick={() => {
                if (isSelected) {
                  setSelectedCategories(selectedCategories.filter(c => c !== cat));
                } else {
                  setSelectedCategories([...selectedCategories, cat]);
                }
              }}>
                {translatedCategory}
                <CategoryCount>({count})</CategoryCount>
              </CategoryText>
            </CategoryItem>
          );
        })}
      </TagList>

      {/* Non-Fiction section for Audiobooks */}
      <SubcategoryHeader>
        {typeof t('categories.nonFiction') === 'string' && t('categories.nonFiction') !== 'categories.nonFiction' ? t('categories.nonFiction') : 'Non-Fiction'}
      </SubcategoryHeader>

      <TagList>
        {categories['Audiobooks']?.['Non-Fiction'] && Object.entries(categories['Audiobooks']['Non-Fiction']).map(([cat, count]) => {
          const isSelected = selectedCategories.includes(cat);
          const translatedCategory = translateCategory(cat, t);
          
          return (
            <CategoryItem key={cat}>
              <CheckboxContainer>
                <CategoryLabel>
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (isSelected) {
                        setSelectedCategories(selectedCategories.filter(c => c !== cat));
                      } else {
                        // Add to current selection rather than replacing
                        setSelectedCategories([...selectedCategories, cat]);
                      }
                    }}
                  />
                </CategoryLabel>
              </CheckboxContainer>
              <CategoryText onClick={() => {
                if (isSelected) {
                  setSelectedCategories(selectedCategories.filter(c => c !== cat));
                } else {
                  setSelectedCategories([...selectedCategories, cat]);
                }
              }}>
                {translatedCategory}
                <CategoryCount>({count})</CategoryCount>
              </CategoryText>
            </CategoryItem>
          );
        })}
      </TagList>
    </SidebarContainer>
  );
};
