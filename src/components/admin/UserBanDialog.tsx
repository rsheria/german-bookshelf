import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiBan, FiX, FiCalendar, FiAlertTriangle } from 'react-icons/fi';
import { banUser } from '../../services/userBanService';
import { Profile } from '../../types/supabase';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: ${props => props.theme.shadows.lg};
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  
  h2 {
    margin: 0;
    font-size: ${props => props.theme.typography.fontSize.xl};
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  svg {
    color: ${props => props.theme.colors.danger};
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: ${props => props.theme.typography.fontWeight.medium};
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.input};
  color: ${props => props.theme.colors.text};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.2);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.input};
  color: ${props => props.theme.colors.text};
  min-height: 100px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.2);
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: ${props => props.theme.borderRadius.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: ${props => props.theme.colors.backgroundAlt};
  color: ${props => props.theme.colors.text};
  border: none;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.backgroundAltHover};
  }
`;

const BanButton = styled(Button)`
  background-color: ${props => props.theme.colors.danger};
  color: white;
  border: none;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.dangerDark};
  }
`;

const RadioOption = styled.div`
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  input[type="radio"] {
    cursor: pointer;
  }
  
  label {
    margin-bottom: 0;
    cursor: pointer;
  }
`;

const WarningMessage = styled.div`
  padding: 0.75rem;
  margin-bottom: 1.5rem;
  background-color: rgba(243, 156, 18, 0.1);
  border-left: 4px solid ${props => props.theme.colors.warning};
  border-radius: ${props => props.theme.borderRadius.md};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    color: ${props => props.theme.colors.warning};
    flex-shrink: 0;
  }
`;

interface UserBanDialogProps {
  user: Profile;
  adminId: string;
  onClose: () => void;
  onBanComplete: () => void;
  userIp?: string;
}

const UserBanDialog: React.FC<UserBanDialogProps> = ({ 
  user, 
  adminId, 
  onClose, 
  onBanComplete,
  userIp
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');
  const [customDays, setCustomDays] = useState(7);
  const [banTarget, setBanTarget] = useState<'user' | 'ip'>('user');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let expiresAt: Date | undefined;
      
      // Calculate expiration date if not permanent
      if (banDuration !== 'permanent') {
        expiresAt = new Date();
        
        if (banDuration === '1day') {
          expiresAt.setDate(expiresAt.getDate() + 1);
        } else if (banDuration === '7days') {
          expiresAt.setDate(expiresAt.getDate() + 7);
        } else if (banDuration === '30days') {
          expiresAt.setDate(expiresAt.getDate() + 30);
        } else if (banDuration === 'custom') {
          expiresAt.setDate(expiresAt.getDate() + customDays);
        }
      }
      
      // Call the ban service
      const targetUserId = banTarget === 'user' ? user.id : undefined;
      const targetIp = banTarget === 'ip' ? userIp : undefined;
      
      const result = await banUser(
        adminId,
        targetUserId,
        targetIp,
        reason,
        expiresAt
      );
      
      if (result) {
        onBanComplete();
      }
    } catch (error) {
      console.error('Error banning user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h2>
            <FiBan size={24} />
            {t('banUser', 'Ban User')}
          </h2>
        </ModalHeader>
        
        <WarningMessage>
          <FiAlertTriangle size={20} />
          <div>
            {t('banWarning', 'Banning a user will prevent them from accessing the application. This action should only be taken for serious violations of the terms of service.')}
          </div>
        </WarningMessage>
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <label>{t('banTarget', 'Ban Target')}:</label>
            <RadioOption>
              <input 
                type="radio" 
                id="banUser" 
                name="banTarget" 
                value="user"
                checked={banTarget === 'user'}
                onChange={() => setBanTarget('user')}
              />
              <label htmlFor="banUser">
                {t('banUserAccount', 'Ban User Account')} ({user.username})
              </label>
            </RadioOption>
            
            {userIp && (
              <RadioOption>
                <input 
                  type="radio" 
                  id="banIp" 
                  name="banTarget" 
                  value="ip"
                  checked={banTarget === 'ip'}
                  onChange={() => setBanTarget('ip')}
                />
                <label htmlFor="banIp">
                  {t('banIpAddress', 'Ban IP Address')} ({userIp})
                </label>
              </RadioOption>
            )}
          </FormGroup>
          
          <FormGroup>
            <label>{t('banDuration', 'Ban Duration')}:</label>
            <RadioOption>
              <input 
                type="radio" 
                id="permanent" 
                name="banDuration" 
                value="permanent"
                checked={banDuration === 'permanent'}
                onChange={() => setBanDuration('permanent')}
              />
              <label htmlFor="permanent">{t('permanentBan', 'Permanent')}</label>
            </RadioOption>
            <RadioOption>
              <input 
                type="radio" 
                id="1day" 
                name="banDuration" 
                value="1day"
                checked={banDuration === '1day'}
                onChange={() => setBanDuration('1day')}
              />
              <label htmlFor="1day">{t('1dayBan', '1 Day')}</label>
            </RadioOption>
            <RadioOption>
              <input 
                type="radio" 
                id="7days" 
                name="banDuration" 
                value="7days"
                checked={banDuration === '7days'}
                onChange={() => setBanDuration('7days')}
              />
              <label htmlFor="7days">{t('7daysBan', '7 Days')}</label>
            </RadioOption>
            <RadioOption>
              <input 
                type="radio" 
                id="30days" 
                name="banDuration" 
                value="30days"
                checked={banDuration === '30days'}
                onChange={() => setBanDuration('30days')}
              />
              <label htmlFor="30days">{t('30daysBan', '30 Days')}</label>
            </RadioOption>
            <RadioOption>
              <input 
                type="radio" 
                id="custom" 
                name="banDuration" 
                value="custom"
                checked={banDuration === 'custom'}
                onChange={() => setBanDuration('custom')}
              />
              <label htmlFor="custom">{t('customDaysBan', 'Custom Days')}:</label>
              {banDuration === 'custom' && (
                <Input 
                  type="number" 
                  min="1" 
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 7)}
                  style={{ width: '80px', marginLeft: '0.5rem' }}
                />
              )}
            </RadioOption>
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="reason">{t('banReason', 'Reason for Ban')}:</label>
            <Textarea 
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('banReasonPlaceholder', 'Enter a reason for this ban...')}
              required
            />
          </FormGroup>
          
          <ModalFooter>
            <CancelButton type="button" onClick={onClose} disabled={isSubmitting}>
              <FiX />
              {t('cancel', 'Cancel')}
            </CancelButton>
            <BanButton type="submit" disabled={isSubmitting}>
              <FiBan />
              {isSubmitting 
                ? t('banning', 'Banning...') 
                : t('confirmBan', 'Confirm Ban')}
            </BanButton>
          </ModalFooter>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default UserBanDialog;
