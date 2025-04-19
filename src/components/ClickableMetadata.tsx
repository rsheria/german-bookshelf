import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const ClickableValue = styled.span`
  cursor: pointer;
  color: ${({ theme }) => theme.colors.primary};
  transition: color 0.2s;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primaryLight};
    text-decoration: underline;
  }
`;

interface ClickableMetadataProps {
  field: string;
  value: string;
  displayValue?: string;
  multiple?: boolean;
}

// List of fields that should be clickable
const CLICKABLE_FIELDS = ['author', 'publisher', 'narrator', 'genre', 'fictionType', 'categories'];

// This component renders a clickable metadata value that navigates to search results
export const ClickableMetadata: React.FC<ClickableMetadataProps> = ({ 
  field, 
  value,
  displayValue,
  multiple = false
}) => {
  const navigate = useNavigate();
  
  // Check if this field should be clickable
  const isClickableField = CLICKABLE_FIELDS.includes(field);
  
  // Sanitize the value by removing invisible Unicode characters
  const sanitizeValue = (val: string) => {
    return val
      .replace(/[\u200E\u200F\u2028\u2029\u200B]/g, '') // Remove left-to-right/right-to-left marks and zero-width spaces
      .trim();
  };
  
  // Create a URL-safe value for navigation
  const createUrlSafeValue = (val: string) => {
    return sanitizeValue(val).replace(/\s+/g, '-');
  };
  
  // Handle click for a single value
  const handleSingleValueClick = (val: string) => {
    const urlSafeValue = createUrlSafeValue(val);
    console.log(`Navigating to search page: /search/${field}/${urlSafeValue}`);
    navigate(`/search/${field}/${urlSafeValue}`);
  };
  
  // If this field shouldn't be clickable, just render the text
  if (!isClickableField) {
    return <span>{displayValue || value}</span>;
  }
  
  // For author and narrator, split comma-separated values and make each clickable
  if (field === 'author' || field === 'narrator') {
    const parts = sanitizeValue(value).split(',').map(v => v.trim()).filter(Boolean);
    return (
      <span>
        {parts.map((val, index) => (
          <React.Fragment key={val}>
            {index > 0 && ', '}
            <ClickableValue onClick={() => handleSingleValueClick(val)}>
              {val}
            </ClickableValue>
          </React.Fragment>
        ))}
      </span>
    );
  }
  
  // For multiple values (like genres)
  if (multiple) {
    return (
      <ClickableValue onClick={() => handleSingleValueClick(value.trim())}>
        {displayValue || value}
      </ClickableValue>
    );
  }
  
  // For single values (like publisher)
  return (
    <ClickableValue onClick={() => handleSingleValueClick(value)}>
      {displayValue || value}
    </ClickableValue>
  );
};