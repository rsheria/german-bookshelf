import React from 'react';
import styled, { css } from 'styled-components';
import theme from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  isFullWidth?: boolean;
  className?: string;
}

const getPadding = (padding: 'none' | 'sm' | 'md' | 'lg') => {
  switch (padding) {
    case 'none': return '0';
    case 'sm': return theme.spacing.md;
    case 'md': return theme.spacing.lg;
    case 'lg': return theme.spacing.xl;
    default: return theme.spacing.lg;
  }
};

const getRadius = (radius: 'sm' | 'md' | 'lg' | 'xl') => {
  switch (radius) {
    case 'sm': return theme.borderRadius.sm;
    case 'md': return theme.borderRadius.md;
    case 'lg': return theme.borderRadius.lg;
    case 'xl': return theme.borderRadius.xl;
    default: return theme.borderRadius.md;
  }
};

const StyledCard = styled.div<CardProps>`
  background-color: ${theme.colors.card};
  padding: ${props => getPadding(props.padding || 'md')};
  border-radius: ${props => getRadius(props.radius || 'md')};
  width: ${props => props.isFullWidth ? '100%' : 'auto'};
  
  ${props => props.variant === 'default' && css`
    box-shadow: ${theme.shadows.sm};
  `}
  
  ${props => props.variant === 'elevated' && css`
    box-shadow: ${theme.shadows.lg};
  `}
  
  ${props => props.variant === 'outlined' && css`
    border: 1px solid ${theme.colors.border};
    box-shadow: none;
  `}
  
  ${props => props.variant === 'interactive' && css`
    box-shadow: ${theme.shadows.sm};
    transition: all ${theme.transitions.fast};
    
    &:hover {
      box-shadow: ${theme.shadows.md};
      transform: translateY(-2px);
    }
    
    &:active {
      box-shadow: ${theme.shadows.sm};
      transform: translateY(0);
    }
  `}
`;

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  radius = 'md',
  isFullWidth = false,
  className,
}) => {
  return (
    <StyledCard
      variant={variant}
      padding={padding}
      radius={radius}
      isFullWidth={isFullWidth}
      className={className}
    >
      {children}
    </StyledCard>
  );
};

export default Card;
