import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';
import theme from '../../styles/theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFullWidth?: boolean;
}

const InputContainer = styled.div<{ isFullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  margin-bottom: ${theme.spacing.md};
  width: ${props => props.isFullWidth ? '100%' : 'auto'};
`;

const InputLabel = styled.label`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.xs};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const LeftIconWrapper = styled.div`
  position: absolute;
  left: ${theme.spacing.md};
  color: ${theme.colors.textLight};
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const RightIconWrapper = styled.div`
  position: absolute;
  right: ${theme.spacing.md};
  color: ${theme.colors.textLight};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledInput = styled.input.attrs<{ hasLeftIcon?: boolean; hasRightIcon?: boolean; hasError?: boolean }>(() => ({
  // Explicitly omit custom props from DOM
}))<{ hasLeftIcon?: boolean; hasRightIcon?: boolean; hasError?: boolean }>`
  width: 100%;
  height: 42px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.typography.fontSize.md};
  font-family: ${theme.typography.fontFamily.body};
  color: ${theme.colors.text};
  background-color: white;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.fast};
  
  ${props => props.hasLeftIcon && css`
    padding-left: ${theme.spacing.xl};
  `}
  
  ${props => props.hasRightIcon && css`
    padding-right: ${theme.spacing.xl};
  `}
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
  }
  
  &:disabled {
    background-color: ${theme.colors.backgroundAlt};
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  &::placeholder {
    color: ${theme.colors.textLight};
    opacity: 0.7;
  }
  
  ${props => props.hasError && css`
    border-color: ${theme.colors.error};
    
    &:focus {
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
    }
  `}
`;

const HelperText = styled.div<{ isError?: boolean }>`
  font-size: ${theme.typography.fontSize.xs};
  margin-top: ${theme.spacing.xs};
  color: ${props => props.isError ? theme.colors.error : theme.colors.textLight};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  isFullWidth = true,
  ...props
}, ref) => {
  return (
    <InputContainer isFullWidth={isFullWidth}>
      {label && <InputLabel>{label}</InputLabel>}
      <InputWrapper>
        {leftIcon && <LeftIconWrapper>{leftIcon}</LeftIconWrapper>}
        <StyledInput
          ref={ref}
          hasLeftIcon={!!leftIcon}
          hasRightIcon={!!rightIcon}
          hasError={!!error}
          aria-invalid={!!error}
          {...props}
        />
        {rightIcon && <RightIconWrapper>{rightIcon}</RightIconWrapper>}
      </InputWrapper>
      {(helperText || error) && (
        <HelperText isError={!!error}>
          {error || helperText}
        </HelperText>
      )}
    </InputContainer>
  );
});

Input.displayName = 'Input';

export default Input;
