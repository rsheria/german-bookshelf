import React from 'react';
import styled, { keyframes } from 'styled-components';
import { FiCheck, FiX, FiLoader } from 'react-icons/fi';
import theme from '../../styles/theme';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const ButtonContainer = styled.button`
  background-color: ${theme.colors.primary};
  color: white;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.md};
  cursor: pointer;
  transition: background-color ${theme.transitions.normal};
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;

  &:hover {
    background-color: ${theme.colors.primaryDark};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.pulse {
    animation: ${pulse} 1s infinite;
  }
`;

const LoaderIcon = styled(FiLoader)`
  margin-right: 8px;
  animation: ${spin} 1s linear infinite;
`;

interface AnimatedSubmitButtonProps {
  label: string;
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  onClick?: () => void;
}

const AnimatedSubmitButton: React.FC<AnimatedSubmitButtonProps> = ({ label, isLoading, isSuccess, isError, onClick }) => {
  return (
    <ButtonContainer onClick={onClick} disabled={isLoading} className={isLoading ? 'pulse' : ''}>
      {isLoading ? (
        <LoaderIcon />
      ) : isSuccess ? (
        <FiCheck style={{ marginRight: '8px' }} />
      ) : isError ? (
        <FiX style={{ marginRight: '8px' }} />
      ) : null}
      {label}
    </ButtonContainer>
  );
};

export default AnimatedSubmitButton;
