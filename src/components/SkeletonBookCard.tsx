import React from 'react';
import styled, { keyframes } from 'styled-components';
import theme from '../styles/theme';

const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

const SkeletonContainer = styled.div`
  background: #f6f7f8;
  background-image: linear-gradient(90deg, #f6f7f8 0px, #edeef1 40px, #f6f7f8 80px);
  background-size: 800px 104px;
  animation: ${shimmer} 1.5s linear infinite;
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SkeletonImage = styled.div`
  width: 100%;
  padding-top: 150%; /* to maintain aspect ratio */
  background: #e0e0e0;
`;

const SkeletonText = styled.div`
  height: 16px;
  margin: ${theme.spacing.sm} ${theme.spacing.md};
  background: #e0e0e0;
  border-radius: ${theme.borderRadius.sm};
`;

const SkeletonTitle = styled(SkeletonText)`
  width: 60%;
  height: 20px;
  margin-bottom: ${theme.spacing.xs};
`;

const SkeletonSubtitle = styled(SkeletonText)`
  width: 40%;
`;

const SkeletonBookCard: React.FC = () => {
  return (
    <SkeletonContainer>
      <SkeletonImage />
      <div style={{ padding: theme.spacing.md }}>
        <SkeletonTitle />
        <SkeletonSubtitle />
      </div>
    </SkeletonContainer>
  );
};

export default SkeletonBookCard;
