import React from 'react';
import styled, { css } from 'styled-components';
import theme from '../../styles/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isFullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const getButtonStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case 'primary':
      return css`
        background-color: ${theme.colors.primary};
        color: white;
        border: none;
        
        &:hover:not(:disabled) {
          background-color: ${theme.colors.primaryLight};
        }
        
        &:active:not(:disabled) {
          background-color: ${theme.colors.primaryDark};
        }
      `;
    case 'secondary':
      return css`
        background-color: ${theme.colors.secondary};
        color: white;
        border: none;
        
        &:hover:not(:disabled) {
          background-color: ${theme.colors.secondaryLight};
        }
        
        &:active:not(:disabled) {
          background-color: ${theme.colors.secondaryDark};
        }
      `;
    case 'outline':
      return css`
        background-color: transparent;
        color: ${theme.colors.primary};
        border: 2px solid ${theme.colors.primary};
        
        &:hover:not(:disabled) {
          background-color: rgba(26, 54, 93, 0.05);
        }
        
        &:active:not(:disabled) {
          background-color: rgba(26, 54, 93, 0.1);
        }
      `;
    case 'ghost':
      return css`
        background-color: transparent;
        color: ${theme.colors.primary};
        border: none;
        
        &:hover:not(:disabled) {
          background-color: rgba(26, 54, 93, 0.05);
        }
        
        &:active:not(:disabled) {
          background-color: rgba(26, 54, 93, 0.1);
        }
      `;
  }
};

const getButtonSize = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return css`
        font-size: ${theme.typography.fontSize.sm};
        padding: ${theme.spacing.xs} ${theme.spacing.md};
        height: 32px;
      `;
    case 'md':
      return css`
        font-size: ${theme.typography.fontSize.md};
        padding: ${theme.spacing.sm} ${theme.spacing.lg};
        height: 40px;
      `;
    case 'lg':
      return css`
        font-size: ${theme.typography.fontSize.lg};
        padding: ${theme.spacing.md} ${theme.spacing.xl};
        height: 48px;
      `;
  }
};

const StyledButton = styled.button.attrs<ButtonProps>(() => ({
  // Explicitly omit custom props from DOM
  variant: undefined,
  size: undefined,
  isFullWidth: undefined,
  isLoading: undefined,
}))<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  font-weight: ${theme.typography.fontWeight.semibold};
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.fast};
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  ${props => getButtonStyles(props.variant || 'primary')}
  ${props => getButtonSize(props.size || 'md')}
  
  ${props => props.isFullWidth && css`
    width: 100%;
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* Loading spinner styles */
  ${props => props.isLoading && css`
    color: transparent !important;
    pointer-events: none;
    
    &::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      top: calc(50% - 10px);
      left: calc(50% - 10px);
      border: 2px solid ${props.variant === 'outline' || props.variant === 'ghost' 
        ? theme.colors.primary 
        : 'rgba(255, 255, 255, 0.5)'};
      border-radius: 50%;
      border-top-color: ${props.variant === 'outline' || props.variant === 'ghost'
        ? theme.colors.primaryLight
        : 'white'};
      animation: button-spinner 0.8s linear infinite;
    }
    
    @keyframes button-spinner {
      to {
        transform: rotate(360deg);
      }
    }
  `}
  
  /* Add subtle shadow */
  box-shadow: ${props => 
    props.variant !== 'ghost' && props.variant !== 'outline' 
      ? theme.shadows.sm
      : 'none'
  };
  
  &:hover:not(:disabled) {
    box-shadow: ${props => 
      props.variant !== 'ghost' && props.variant !== 'outline'
        ? theme.shadows.md
        : 'none'
    };
    transform: translateY(-1px);
  }
  
  &:active:not(:disabled) {
    box-shadow: ${theme.shadows.sm};
    transform: translateY(0);
  }
`;

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isFullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      isFullWidth={isFullWidth}
      isLoading={isLoading}
      {...props}
    >
      {leftIcon && !isLoading && leftIcon}
      {children}
      {rightIcon && !isLoading && rightIcon}
    </StyledButton>
  );
};

export default Button;
