import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiGlobe, FiX, FiBan, FiAlertCircle, FiMap, FiUsers, FiCalendar } from 'react-icons/fi';
import { getUserIpLogs } from '../../services/ipTrackingService';
import { getBansByIp, banUser } from '../../services/userBanService';
import { Profile, IpLog, UserBan } from '../../types/supabase';
import { format } from 'date-fns';

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
  overflow-y: auto;
  padding: 2rem;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  box-shadow: ${props => props.theme.shadows.lg};
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  
  h2 {
    margin: 0;
    font-size: ${props => props.theme.typography.fontSize.xl};
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textDim};
  cursor: pointer;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  
  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 1.5rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 3px solid ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.text};
  font-weight: ${props => props.$active ? props.theme.typography.fontWeight.semibold : props.theme.typography.fontWeight.normal};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const IpList = styled.div`
  margin-bottom: 1.5rem;
`;

const IpItem = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const IpAddress = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const IpMeta = styled.div`
  display: flex;
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textDim};
  gap: 1rem;
  align-items: center;
`;

const BanList = styled.div`
  margin-bottom: 1.5rem;
`;

const BanItem = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const BanHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const BanInfo = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const BanStatus = styled.span<{ $active: boolean }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  background-color: ${props => props.$active ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)'};
  color: ${props => props.$active ? props.theme.colors.danger : props.theme.colors.success};
`;

const BanMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textDim};
  gap: 1rem;
  margin-bottom: 0.5rem;
`;

const BanReason = styled.div`
  font-style: italic;
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button`
  padding: 0.5rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.sm};
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

const BanButton = styled(Button)`
  background-color: ${props => props.theme.colors.danger};
  color: white;
  border: none;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.dangerDark};
  }
`;

const UsersList = styled.div`
  margin-top: 1.5rem;
`;

const UsersListHeader = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserItem = styled.div`
  padding: 0.75rem;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const Username = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const LoadingState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.textDim};
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.textDim};
`;

const BanFormOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
`;

const BanFormContent = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: ${props => props.theme.shadows.lg};
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

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const CancelButton = styled(Button)`
  background-color: ${props => props.theme.colors.backgroundAlt};
  color: ${props => props.theme.colors.text};
  border: none;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.backgroundAltHover};
  }
`;

interface UserIpTrackingDialogProps {
  user: Profile;
  adminId: string;
  onClose: () => void;
  onAction?: () => void;
}

type TabType = 'ip-logs' | 'bans';

const UserIpTrackingDialog: React.FC<UserIpTrackingDialogProps> = ({ 
  user, 
  adminId, 
  onClose,
  onAction 
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('ip-logs');
  const [ipLogs, setIpLogs] = useState<IpLog[]>([]);
  const [ipBans, setIpBans] = useState<Record<string, UserBan[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Ban form state
  const [showBanForm, setShowBanForm] = useState(false);
  const [selectedIp, setSelectedIp] = useState('');
  const [reason, setReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');
  const [customDays, setCustomDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const logs = await getUserIpLogs(user.id);
        setIpLogs(logs);
        
        // Fetch ban status for each unique IP
        const uniqueIps = Array.from(new Set(logs.map(log => log.ip_address)));
        const bansRecord: Record<string, UserBan[]> = {};
        
        for (const ip of uniqueIps) {
          const bans = await getBansByIp(ip);
          if (bans.length > 0) {
            bansRecord[ip] = bans;
          }
        }
        
        setIpBans(bansRecord);
      } catch (error) {
        console.error('Error fetching IP data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user.id]);
  
  const handleBanIp = (ip: string) => {
    setSelectedIp(ip);
    setShowBanForm(true);
  };
  
  const handleSubmitBan = async (e: React.FormEvent) => {
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
      const result = await banUser(
        adminId,
        undefined, // No user ID for IP ban
        selectedIp,
        reason,
        expiresAt
      );
      
      if (result) {
        // Update the bans record
        const newBan: UserBan = {
          id: result,
          ip_address: selectedIp,
          reason,
          banned_by: adminId,
          banned_at: new Date().toISOString(),
          expires_at: expiresAt?.toISOString(),
          is_active: true
        };
        
        setIpBans(prev => ({
          ...prev,
          [selectedIp]: [...(prev[selectedIp] || []), newBan]
        }));
        
        setShowBanForm(false);
        if (onAction) onAction();
      }
    } catch (error) {
      console.error('Error banning IP:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const cancelBan = () => {
    setShowBanForm(false);
    setSelectedIp('');
    setReason('');
    setBanDuration('permanent');
    setCustomDays(7);
  };
  
  const isIpBanned = (ip: string): boolean => {
    if (!ipBans[ip]) return false;
    
    return ipBans[ip].some(ban => 
      ban.is_active && (!ban.expires_at || new Date(ban.expires_at) > new Date())
    );
  };
  
  const renderIpLogs = () => {
    if (isLoading) {
      return <LoadingState>{t('loading', 'Loading...')}</LoadingState>;
    }
    
    if (ipLogs.length === 0) {
      return <EmptyState>{t('noIpLogs', 'No IP logs found for this user')}</EmptyState>;
    }
    
    // Group by IP address
    const ipGroups: Record<string, IpLog[]> = {};
    
    ipLogs.forEach(log => {
      if (!ipGroups[log.ip_address]) {
        ipGroups[log.ip_address] = [];
      }
      ipGroups[log.ip_address].push(log);
    });
    
    return (
      <IpList>
        {Object.entries(ipGroups).map(([ip, logs]) => (
          <IpItem key={ip}>
            <IpAddress>
              <FiGlobe />
              {ip}
              {isIpBanned(ip) && (
                <BanStatus $active={true}>
                  {t('banned', 'Banned')}
                </BanStatus>
              )}
            </IpAddress>
            <IpMeta>
              <MetaItem>
                <FiCalendar size={14} />
                {t('lastSeen', 'Last seen')}: {format(new Date(logs[0].created_at), 'MMM d, yyyy HH:mm')}
              </MetaItem>
              <MetaItem>
                <FiUsers size={14} />
                {t('occurrences', 'Occurrences')}: {logs.length}
              </MetaItem>
              {!isIpBanned(ip) && (
                <BanButton onClick={() => handleBanIp(ip)}>
                  <FiBan size={14} />
                  {t('banIp', 'Ban IP')}
                </BanButton>
              )}
            </IpMeta>
          </IpItem>
        ))}
      </IpList>
    );
  };
  
  const renderBans = () => {
    if (isLoading) {
      return <LoadingState>{t('loading', 'Loading...')}</LoadingState>;
    }
    
    const allBans = Object.values(ipBans).flat();
    
    if (allBans.length === 0) {
      return <EmptyState>{t('noIpBans', 'No IP bans found for this user')}</EmptyState>;
    }
    
    return (
      <BanList>
        {allBans.map(ban => (
          <BanItem key={ban.id}>
            <BanHeader>
              <BanInfo>
                {ban.ip_address}
              </BanInfo>
              <BanStatus $active={ban.is_active}>
                {ban.is_active ? t('active', 'Active') : t('inactive', 'Inactive')}
              </BanStatus>
            </BanHeader>
            <BanMeta>
              <MetaItem>
                <FiCalendar size={14} />
                {t('bannedOn', 'Banned on')}: {format(new Date(ban.banned_at), 'MMM d, yyyy')}
              </MetaItem>
              {ban.expires_at && (
                <MetaItem>
                  <FiCalendar size={14} />
                  {t('expiresOn', 'Expires on')}: {format(new Date(ban.expires_at), 'MMM d, yyyy')}
                </MetaItem>
              )}
            </BanMeta>
            {ban.reason && (
              <BanReason>
                {t('reason', 'Reason')}: {ban.reason}
              </BanReason>
            )}
          </BanItem>
        ))}
      </BanList>
    );
  };
  
  return (
    <>
      <ModalOverlay onClick={onClose}>
        <ModalContent onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <h2>
              <FiGlobe />
              {t('userIpTracking', 'User IP Tracking')} - {user.username}
            </h2>
            <CloseButton onClick={onClose}>
              <FiX />
            </CloseButton>
          </ModalHeader>
          
          <TabContainer>
            <Tab 
              $active={activeTab === 'ip-logs'} 
              onClick={() => setActiveTab('ip-logs')}
            >
              <FiGlobe />
              {t('ipLogs', 'IP Logs')}
            </Tab>
            <Tab 
              $active={activeTab === 'bans'} 
              onClick={() => setActiveTab('bans')}
            >
              <FiBan />
              {t('ipBans', 'IP Bans')}
            </Tab>
          </TabContainer>
          
          {activeTab === 'ip-logs' ? renderIpLogs() : renderBans()}
        </ModalContent>
      </ModalOverlay>
      
      {showBanForm && (
        <BanFormOverlay onClick={cancelBan}>
          <BanFormContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h2>
                <FiBan />
                {t('banIpAddress', 'Ban IP Address')} - {selectedIp}
              </h2>
              <CloseButton onClick={cancelBan}>
                <FiX />
              </CloseButton>
            </ModalHeader>
            
            <form onSubmit={handleSubmitBan}>
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
                <CancelButton type="button" onClick={cancelBan} disabled={isSubmitting}>
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
          </BanFormContent>
        </BanFormOverlay>
      )}
    </>
  );
};

export default UserIpTrackingDialog;
