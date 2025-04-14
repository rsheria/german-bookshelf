import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { supabase } from '../services/supabase';

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

const CategoryItem = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const CategoryLink = styled(Link)<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme, active }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ theme, active }) => active ? '#fff' : theme.colors.text};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background-color: ${({ theme, active }) => active ? theme.colors.primary : theme.colors.backgroundAlt};
  }
  
  & span {
    display: flex;
    align-items: center;
  }
  
  & .count {
    background-color: ${({ theme, active }) => active ? 'rgba(255, 255, 255, 0.2)' : theme.colors.backgroundAlt};
    padding: 0 ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.borderRadius.full};
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    color: ${({ theme, active }) => active ? '#fff' : theme.colors.textLight};
  }
`;

const CategoryLabel = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const CategoryCount = styled.span`
  color: ${({ theme }) => theme.colors.textLight};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const SubcategoryContainer = styled.div`
  margin-left: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const SubcategoryItem = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const SubcategoryLink = styled(Link)<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  background-color: transparent;
  color: ${({ theme, active }) => active ? theme.colors.primary : theme.colors.textLight};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme }) => theme.colors.primary};
  }
  
  & .count {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
    padding: 0 ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.borderRadius.full};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  
  &:hover {
    text-decoration: underline;
  }
`;

// Types for category data structure
interface Category {
  id: string;
  name: string;
  count: number;
  subcategories?: Category[];
}

export const CategorySidebar: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const { categoryId } = useParams<{ categoryId?: string }>();
  
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      
      try {
        // This is a placeholder query - you'll need to adapt this to your actual database structure
        const { data, error } = await supabase
          .from('books')
          .select('genre')
          .not('genre', 'is', null);
          
        if (error) {
          console.error('Error fetching categories:', error);
        } else if (data) {
          // Group books by genre and count them
          const genreCounts: Record<string, number> = {};
          data.forEach(book => {
            const genre = book.genre;
            if (genre) {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            }
          });
          
          // Convert to category objects
          const categoryData: Category[] = Object.entries(genreCounts).map(([name, count]) => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            count
          }));
          
          // Sort by count (descending)
          categoryData.sort((a, b) => b.count - a.count);
          
          setCategories(categoryData);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };
  
  const renderCategory = (category: Category) => {
    const isExpanded = expandedCategories.includes(category.id);
    const isActive = category.id === categoryId;
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;
    
    return (
      <CategoryItem key={category.id}>
        <CategoryLink to={`/category/${category.id}`} active={isActive}>
          <CategoryLabel>
            {hasSubcategories && (
              isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />
            )}
            {category.name}
          </CategoryLabel>
          <CategoryCount>({category.count})</CategoryCount>
        </CategoryLink>
        
        {hasSubcategories && (
          <>
            {isExpanded && (
              <SubcategoryContainer>
                {category.subcategories!.map(subcategory => (
                  <SubcategoryItem key={subcategory.id}>
                    <SubcategoryLink 
                      to={`/category/${subcategory.id}`} 
                      active={subcategory.id === categoryId}
                    >
                      <CategoryLabel>{subcategory.name}</CategoryLabel>
                      <CategoryCount>({subcategory.count})</CategoryCount>
                    </SubcategoryLink>
                  </SubcategoryItem>
                ))}
              </SubcategoryContainer>
            )}
            
            {hasSubcategories && (
              <ToggleButton onClick={() => toggleCategory(category.id)}>
                {isExpanded ? (
                  <><FiChevronDown size={14} /> {t('categories.hide')}</>
                ) : (
                  <><FiChevronRight size={14} /> {t('categories.show')}</>
                )}
              </ToggleButton>
            )}
          </>
        )}
      </CategoryItem>
    );
  };
  
  if (loading) {
    return (
      <SidebarContainer>
        <SidebarHeader>{t('categories.title')}</SidebarHeader>
        <div>{t('common.loading')}</div>
      </SidebarContainer>
    );
  }
  
  return (
    <SidebarContainer>
      <SidebarHeader>{t('categories.title')}</SidebarHeader>
      <CategoryItem>
        {categories.map(renderCategory)}
      </CategoryItem>
    </SidebarContainer>
  );
};
