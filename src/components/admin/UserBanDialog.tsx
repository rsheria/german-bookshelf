import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiShield, FiX } from 'react-icons/fi';
import { Profile } from '../../types/supabase';

interface UserBanDialogProps {
  user: Profile;
  isOpen: boolean;
  onClose: () => void;
  onBanUser: (userId: string, reason: string, duration: number | null) => void;
}

const UserBanDialog: React.FC<UserBanDialogProps> = ({ user, isOpen, onClose, onBanUser }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBanUser = async () => {
    if (!reason.trim()) {
      setError(t('banReasonRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Calculate ban duration based on selection
      const banDays = duration === -1 ? null : (duration === 0 ? customDuration : duration);
      
      // Call the onBanUser callback
      onBanUser(user.id, reason, banDays);
    } catch (err: any) {
      console.error('Error banning user:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogOverlay>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <FiShield /> {t('banUser')}: {user.username}
          </DialogTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </DialogHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <DialogBody>
          <FormGroup>
            <Label>{t('banReason')}</Label>
            <TextArea 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('enterBanReason')}
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <Label>{t('banDuration')}</Label>
            <RadioGroup>
              <RadioOption>
                <input 
                  type="radio" 
                  name="duration" 
                  checked={duration === 1} 
                  onChange={() => setDuration(1)} 
                />
                <RadioLabel>{t('oneDay')}</RadioLabel>
              </RadioOption>
              <RadioOption>
                <input 
                  type="radio" 
                  name="duration" 
                  checked={duration === 7} 
                  onChange={() => setDuration(7)} 
                />
                <RadioLabel>{t('oneWeek')}</RadioLabel>
              </RadioOption>
              <RadioOption>
                <input 
                  type="radio" 
                  name="duration" 
                  checked={duration === 30} 
                  onChange={() => setDuration(30)} 
                />
                <RadioLabel>{t('oneMonth')}</RadioLabel>
              </RadioOption>
              <RadioOption>
                <input 
                  type="radio" 
                  name="duration" 
                  checked={duration === -1} 
                  onChange={() => setDuration(-1)} 
                />
                <RadioLabel>{t('permanent')}</RadioLabel>
              </RadioOption>
              <RadioOption>
                <input 
                  type="radio" 
                  name="duration" 
                  checked={duration === 0} 
                  onChange={() => setDuration(0)} 
                />
                <RadioLabel>{t('custom')}</RadioLabel>
                {duration === 0 && (
                  <CustomDurationInput
                    type="number"
                    min="1"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(parseInt(e.target.value) || 1)}
                  />
                )}
              </RadioOption>
            </RadioGroup>
          </FormGroup>
        </DialogBody>

        <DialogFooter>
          <CancelButton onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </CancelButton>
          <BanButton onClick={handleBanUser} disabled={isSubmitting}>
            {isSubmitting ? t('banning') : t('banUser')}
          </BanButton>
        </DialogFooter>
      </DialogContent>
    </DialogOverlay>
  );
};

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DialogContent = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadows.lg};
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const DialogTitle = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.colors.textDim};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
    color: ${props => props.theme.colors.text};
  }
`;

const DialogBody = styled.div`
  padding: 1.5rem;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const ErrorMessage = styled.div`
  background-color: ${props => props.theme.colors.danger}20;
  color: ${props => props.theme.colors.danger};
  padding: 0.75rem 1rem;
  margin: 0.75rem 1.5rem 0;
  border-radius: ${props => props.theme.borderRadius.md};
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundInput};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const RadioOption = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RadioLabel = styled.span`
  font-size: ${props => props.theme.typography.fontSize.md};
`;

const CustomDurationInput = styled.input`
  width: 60px;
  padding: 0.25rem 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  margin-left: 0.5rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const BanButton = styled(Button)`
  background-color: ${props => props.theme.colors.danger};
  border: none;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.dangerHover || props.theme.colors.danger};
    box-shadow: ${props => props.theme.shadows.sm};
  }
`;

export default UserBanDialog;
