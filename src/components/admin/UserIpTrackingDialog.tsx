import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiGlobe, FiX, FiShield, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../../services/supabase';
import { Profile, UserIp } from '../../types/supabase';

interface UserIpTrackingDialogProps {
  user: Profile;
  isOpen: boolean;
  onClose: () => void;
}

const UserIpTrackingDialog: React.FC<UserIpTrackingDialogProps> = ({ 
  user, 
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const [ipRecords, setIpRecords] = useState<UserIp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  useEffect(() => {
    fetchUserIps();
  }, [user.id]);

  const fetchUserIps = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('user_ips')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false });
      
      if (error) throw error;
      
      setIpRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching user IP records:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockIp = async (ip: string) => {
    setSelectedIp(ip);
    setBlockReason('');
    setIsBlocking(true);
  };

  const handleConfirmBlock = async () => {
    if (!selectedIp) return;
    if (!blockReason.trim()) {
      setError(t('blockReasonRequired'));
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const { error: blockError } = await supabase.rpc('block_ip', {
        ip: selectedIp,
        reason: blockReason
      });
      
      if (blockError) throw blockError;
      
      setSuccess(t('ipAddressBlocked', { ip: selectedIp }));
      setSelectedIp(null);
      setIsBlocking(false);
      
      // Refresh IP records
      await fetchUserIps();
    } catch (err: any) {
      console.error('Error blocking IP:', err.message);
      setError(err.message);
    }
  };

  const handleCancelBlock = () => {
    setSelectedIp(null);
    setIsBlocking(false);
    setBlockReason('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <DialogOverlay>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <FiGlobe /> {t('ipAddressesFor')}: {user.username}
          </DialogTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </DialogHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        <DialogBody>
          {isLoading ? (
            <LoadingState>{t('loadingIpRecords')}</LoadingState>
          ) : isBlocking ? (
            <BlockIpForm>
              <h4>{t('blockIpAddress')}: {selectedIp}</h4>
              <p>{t('blockIpWarning')}</p>
              
              <FormGroup>
                <Label>{t('blockReason')}</Label>
                <TextArea 
                  value={blockReason} 
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder={t('enterBlockReason')}
                  rows={3}
                />
              </FormGroup>
              
              <ButtonGroup>
                <CancelButton onClick={handleCancelBlock}>
                  {t('cancel')}
                </CancelButton>
                <BlockButton onClick={handleConfirmBlock}>
                  {t('blockIpAddress')}
                </BlockButton>
              </ButtonGroup>
            </BlockIpForm>
          ) : ipRecords.length > 0 ? (
            <IpTable>
              <thead>
                <tr>
                  <TableHeader>{t('ipAddress')}</TableHeader>
                  <TableHeader>{t('device')}</TableHeader>
                  <TableHeader>{t('firstSeen')}</TableHeader>
                  <TableHeader>{t('lastSeen')}</TableHeader>
                  <TableHeader>{t('status')}</TableHeader>
                  <TableHeader>{t('actions')}</TableHeader>
                </tr>
              </thead>
              <tbody>
                {ipRecords.map((record) => (
                  <TableRow key={record.id} blocked={record.is_blocked}>
                    <TableCell>{record.ip_address}</TableCell>
                    <TableCell>{record.device_info || t('unknown')}</TableCell>
                    <TableCell>{formatDate(record.first_seen)}</TableCell>
                    <TableCell>{formatDate(record.last_seen)}</TableCell>
                    <TableCell>
                      {record.is_blocked ? (
                        <BlockedStatus>
                          <FiAlertCircle /> {t('blocked')}
                          {record.block_reason && (
                            <BlockReason>{record.block_reason}</BlockReason>
                          )}
                        </BlockedStatus>
                      ) : (
                        <ActiveStatus>{t('active')}</ActiveStatus>
                      )}
                    </TableCell>
                    <TableCell>
                      {!record.is_blocked && (
                        <ActionButton 
                          danger
                          onClick={() => handleBlockIp(record.ip_address)}
                        >
                          <FiShield /> {t('block')}
                        </ActionButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </IpTable>
          ) : (
            <EmptyState>{t('noIpRecordsFound')}</EmptyState>
          )}
        </DialogBody>

        {!isBlocking && (
          <DialogFooter>
            <CloseFooterButton onClick={onClose}>
              {t('close')}
            </CloseFooterButton>
          </DialogFooter>
        )}
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
  max-width: 800px;
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

const SuccessMessage = styled.div`
  background-color: ${props => props.theme.colors.success}20;
  color: ${props => props.theme.colors.success};
  padding: 0.75rem 1rem;
  margin: 0.75rem 1.5rem 0;
  border-radius: ${props => props.theme.borderRadius.md};
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

const IpTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const TableRow = styled.tr<{ blocked?: boolean }>`
  background-color: ${props => props.blocked 
    ? props.theme.colors.danger + '10' 
    : 'transparent'};
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const TableCell = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const BlockIpForm = styled.div`
  padding: 1rem;
  
  h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  p {
    margin-bottom: 1.5rem;
    color: ${props => props.theme.colors.textDim};
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
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

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;
`;

const CancelButton = styled(Button)`
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const BlockButton = styled(Button)`
  background-color: ${props => props.theme.colors.danger};
  border: none;
  color: white;
  
  &:hover {
    background-color: ${props => props.theme.colors.dangerHover || props.theme.colors.danger};
  }
`;

const CloseFooterButton = styled(Button)`
  background-color: ${props => props.theme.colors.primary};
  border: none;
  color: white;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryHover || props.theme.colors.primary};
  }
`;

const ActionButton = styled.button<{ danger?: boolean }>`
  padding: 0.5rem 0.75rem;
  background-color: ${props => props.danger 
    ? props.theme.colors.danger + '20' 
    : props.theme.colors.primary + '20'};
  color: ${props => props.danger 
    ? props.theme.colors.danger 
    : props.theme.colors.primary};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${props => props.theme.typography.fontSize.sm};
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.danger 
      ? props.theme.colors.danger + '30' 
      : props.theme.colors.primary + '30'};
    transform: translateY(-2px);
  }
`;

const BlockedStatus = styled.div`
  display: flex;
  flex-direction: column;
  color: ${props => props.theme.colors.danger};
  align-items: flex-start;
  
  svg {
    margin-right: 0.25rem;
  }
`;

const BlockReason = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xs};
  color: ${props => props.theme.colors.textDim};
  margin-top: 0.25rem;
`;

const ActiveStatus = styled.div`
  color: ${props => props.theme.colors.success};
`;

export default UserIpTrackingDialog;
