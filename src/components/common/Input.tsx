import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';
import theme from '../../styles/theme';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFullWidth?: boolean;
}

const InputContainer = styled.div.withConfig({
  shouldForwardProp: prop => prop !== 'isFullWidth',
})<{ isFullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  margin-bottom: ${theme.spacing.md};
  width: ${({ isFullWidth }) => (isFullWidth ? '100%' : 'auto')};
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
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.inputPlaceholder};
`;

const RightIconWrapper = styled.div`
  position: absolute;
  right: ${theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.inputPlaceholder};
`;

const StyledInput = styled.input<{
  $hasLeftIcon: boolean;
  $hasRightIcon: boolean;
  $hasError: boolean;
}>`
  width: 100%;
  height: 42px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.typography.fontSize.md};
  font-family: ${theme.typography.fontFamily.body};
  color: ${theme.colors.inputText};
  background-color: ${theme.colors.input};
  border: 1px solid ${theme.colors.inputBorder};
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transitions.fast};

  ${({ $hasLeftIcon }) =>
    $hasLeftIcon &&
    css`
      padding-left: ${theme.spacing.xl};
    `}

  ${({ $hasRightIcon }) =>
    $hasRightIcon &&
    css`
      padding-right: ${theme.spacing.xl};
    `}

  ${({ $hasError }) =>
    $hasError &&
    css`
      border-color: ${theme.colors.error};
      &:focus {
        box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
      }
    `}

  &:focus {
    outline: none;
    border-color: ${({ $hasError }) => ($hasError ? theme.colors.error : theme.colors.primary)};
    box-shadow: 0 0 0 3px
      ${({ $hasError }) =>
        $hasError ? 'rgba(231,76,60,0.1)' : 'rgba(26,54,93,0.1)'};
  }

  &:disabled {
    background-color: ${theme.colors.inputPlaceholder};
    cursor: not-allowed;
    opacity: 0.7;
  }

  &::placeholder {
    color: ${theme.colors.inputPlaceholder};
    opacity: 0.7;
  }
`;

const HelperText = styled.div<{ isError: boolean }>`
  font-size: ${theme.typography.fontSize.xs};
  margin-top: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  color: ${({ isError }) => (isError ? theme.colors.error : theme.colors.inputPlaceholder)};
`;

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, helperText, error, leftIcon, rightIcon, isFullWidth = true, ...inputProps },
    ref
  ) => {
    const hasLeft = Boolean(leftIcon);
    const hasRight = Boolean(rightIcon);
    const hasError = Boolean(error);

    return (
      <InputContainer isFullWidth={isFullWidth}>
        {label && <InputLabel>{label}</InputLabel>}
        <InputWrapper>
          {hasLeft && <LeftIconWrapper>{leftIcon}</LeftIconWrapper>}
          <StyledInput
            ref={ref}
            {...inputProps}
            $hasLeftIcon={hasLeft}
            $hasRightIcon={hasRight}
            $hasError={hasError}
            aria-invalid={hasError}
          />
          {hasRight && <RightIconWrapper>{rightIcon}</RightIconWrapper>}
        </InputWrapper>
        {(helperText || error) && (
          <HelperText isError={hasError}>{error || helperText}</HelperText>
        )}
      </InputContainer>
    );
  }
);

Input.displayName = 'Input';
export default Input;
