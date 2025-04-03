import React from 'react';
import styled, { css } from 'styled-components';
import theme from '../../styles/theme';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: boolean;
  className?: string;
}

const getBadgeColor = (variant: BadgeVariant) => {
  switch (variant) {
    case 'primary':
      return css`
        background-color: ${theme.colors.primaryLight};
        color: white;
      `;
    case 'secondary':
      return css`
        background-color: ${theme.colors.secondary};
        color: white;
      `;
    case 'success':
      return css`
        background-color: ${theme.colors.success};
        color: white;
      `;
    case 'warning':
      return css`
        background-color: ${theme.colors.warning};
        color: #212121;
      `;
    case 'error':
      return css`
        background-color: ${theme.colors.error};
        color: white;
      `;
    case 'info':
      return css`
        background-color: ${theme.colors.accent};
        color: white;
      `;
  }
};

const getBadgeSize = (size: BadgeSize) => {
  switch (size) {
    case 'sm':
      return css`
        font-size: ${theme.typography.fontSize.xs};
        padding: 0.125rem 0.375rem;
      `;
    case 'md':
      return css`
        font-size: ${theme.typography.fontSize.sm};
        padding: 0.25rem 0.5rem;
      `;
    case 'lg':
      return css`
        font-size: ${theme.typography.fontSize.md};
        padding: 0.375rem 0.75rem;
      `;
  }
};

const StyledBadge = styled.span<BadgeProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: ${theme.typography.fontWeight.semibold};
  border-radius: ${props => props.rounded ? '9999px' : theme.borderRadius.md};
  white-space: nowrap;
  
  ${props => getBadgeColor(props.variant || 'primary')}
  ${props => getBadgeSize(props.size || 'md')}
`;

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = false,
  className,
}) => {
  return (
    <StyledBadge
      variant={variant}
      size={size}
      rounded={rounded}
      className={className}
    >
      {children}
    </StyledBadge>
  );
};

export default Badge;
