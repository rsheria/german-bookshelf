import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiStar } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import theme from '../styles/theme';

interface RatingSystemProps {
  bookId: string;
  currentRating?: number;
  onRatingChange?: (newRating: number) => void;
}

const RatingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: ${theme.spacing.md} 0;
`;

const StarsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const RatingText = styled.p`
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.xs};
  color: ${theme.colors.textLight};
`;

const LoginPrompt = styled.p`
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.xs};
  color: ${theme.colors.accent};
`;

const LoadingWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.xs};
  color: ${theme.colors.primaryLight};
`;

const StarIcon = styled(motion.div)<{ filled: boolean }>`
  cursor: pointer;
  color: ${props => props.filled ? theme.colors.warning : theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SuccessMessage = styled.p`
  color: ${theme.colors.success};
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.xs};
`;

const RatingSystem: React.FC<RatingSystemProps> = ({ 
  bookId, 
  currentRating,
  onRatingChange 
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch the user's existing rating for this book
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('book_ratings')
          .select('rating')
          .eq('book_id', bookId)
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "row not found" error
          console.error('Error fetching user rating:', error);
          return;
        }
        
        if (data) {
          setUserRating(data.rating);
          setSelectedRating(data.rating);
        }
      } catch (err) {
        console.error('Error in fetchUserRating:', err);
      }
    };
    
    fetchUserRating();
  }, [bookId, user]);

  const handleRatingSubmit = async (rating: number) => {
    if (!user) return;
    
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      const { error } = await supabase
        .from('book_ratings')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          rating: rating
        }, {
          onConflict: 'user_id,book_id'
        });
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setUserRating(rating);
      setSelectedRating(rating);
      setSuccessMessage(t('ratings.successMessage'));
      
      // Notify parent component if callback provided
      if (onRatingChange) {
        onRatingChange(rating);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting rating:', err);
      setErrorMessage(t('ratings.errorMessage'));
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Generate the stars for the rating
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      // Each star represents 2 rating points (1-10 scale)
      const starValue = i * 2;
      const halfStarValue = starValue - 1;
      
      // Determine if the star should be filled based on hover state or selection
      const filled = hoveredRating 
        ? starValue <= hoveredRating
        : selectedRating
          ? starValue <= selectedRating
          : currentRating
            ? starValue <= currentRating
            : false;
            
      const halfFilled = hoveredRating 
        ? false // No half stars on hover
        : selectedRating
          ? false // No half stars for user selection
          : currentRating
            ? halfStarValue <= currentRating && starValue > currentRating
            : false;
      
      stars.push(
        <StarIcon 
          key={i}
          filled={filled || halfFilled}
          onHoverStart={() => setHoveredRating(starValue)}
          onHoverEnd={() => setHoveredRating(null)}
          onClick={() => handleRatingSubmit(starValue)}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <FiStar 
            size={24} 
            fill={filled ? "currentColor" : "none"} 
            stroke="currentColor"
          />
        </StarIcon>
      );
    }
    return stars;
  };

  return (
    <RatingContainer>
      <StarsContainer>
        {renderStars()}
      </StarsContainer>
      
      {!user && <LoginPrompt>{t('ratings.loginToRate')}</LoginPrompt>}
      
      {loading && (
        <LoadingWrapper>
          <span>{t('common.loading')}...</span>
        </LoadingWrapper>
      )}
      
      {userRating && (
        <RatingText>
          {t('ratings.yourRating')}: {userRating}/10
        </RatingText>
      )}
      
      {currentRating && !userRating && (
        <RatingText>
          {t('ratings.averageRating')}: {currentRating.toFixed(1)}/10
        </RatingText>
      )}
      
      {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}
      {errorMessage && <RatingText style={{ color: theme.colors.error }}>{errorMessage}</RatingText>}
    </RatingContainer>
  );
};

export default RatingSystem;
