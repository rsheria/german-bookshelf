import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiUsers, FiClock, FiRefreshCw, FiDownload, FiEye, FiBook } from 'react-icons/fi';
import { getOnlineUsers } from '../../services/onlineUserService';
import { getUserDownloadStats } from '../../services/downloadService';
import { OnlineUser, UserDownloadStats } from '../../types/supabase';
import { formatDistanceToNow } from 'date-fns';

const PanelContainer = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    font-size: ${props => props.theme.typography.fontSize.xl};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const RefreshButton = styled.button`
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${props => props.theme.typography.fontSize.sm};
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  
  &:hover {
    background-color: ${props => props.theme.colors.secondary};
    color: ${props => props.theme.colors.card};
  }
  
  svg {
    transition: all 0.3s ease;
  }
  
  &:active svg {
    transform: rotate(180deg);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const OnlineCount = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: rgba(46, 204, 113, 0.1);
  color: ${props => props.theme.colors.success};
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  margin-left: 0.5rem;
`;

const UsersList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const UserItem = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const Username = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserMeta = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textDim};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
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

const ViewButton = styled.button`
  padding: 0.5rem 0.75rem;
  background-color: ${props => props.theme.colors.primary};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  color: white;
  font-size: ${props => props.theme.typography.fontSize.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryLight};
  }
`;

interface OnlineUsersPanelProps {
  refreshInterval?: number; // in milliseconds, default 60000 (1 minute)
  maxUsers?: number;
  onViewUser?: (userId: string) => void;
  className?: string;
}

const OnlineUsersPanel: React.FC<OnlineUsersPanelProps> = ({ 
  refreshInterval = 60000,
  maxUsers = 10,
  onViewUser,
  className
}) => {
  const { t } = useTranslation();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [downloadStats, setDownloadStats] = useState<Record<string, UserDownloadStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchData = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const users = await getOnlineUsers();
      setOnlineUsers(users);
      
      // Fetch download stats for online users
      if (users.length > 0) {
        const stats = await getUserDownloadStats();
        const statsByUserId: Record<string, UserDownloadStats> = {};
        
        stats.forEach(stat => {
          statsByUserId[stat.user_id] = stat;
        });
        
        setDownloadStats(statsByUserId);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, refreshInterval);
    
    return () => {
      clearInterval(interval);
    };
  }, [refreshInterval]);
  
  const formatLastActive = (timestamp: string): string => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'unknown';
    }
  };
  
  return (
    <PanelContainer className={className}>
      <PanelHeader>
        <h3>
          <FiUsers />
          {t('onlineUsers', 'Online Users')}
          <OnlineCount>{onlineUsers.length}</OnlineCount>
        </h3>
        <RefreshButton onClick={fetchData} disabled={isRefreshing}>
          <FiRefreshCw />
          {t('refresh', 'Refresh')}
        </RefreshButton>
      </PanelHeader>
      
      <UsersList>
        {isLoading ? (
          <LoadingState>{t('loading', 'Loading...')}</LoadingState>
        ) : onlineUsers.length === 0 ? (
          <EmptyState>{t('noOnlineUsers', 'No users currently online')}</EmptyState>
        ) : (
          onlineUsers.slice(0, maxUsers).map(user => {
            const userStats = downloadStats[user.user_id];
            
            return (
              <UserItem key={user.user_id}>
                <UserInfo>
                  <Username>
                    {user.username}
                  </Username>
                  <UserMeta>
                    <MetaItem>
                      <FiClock size={14} />
                      {formatLastActive(user.last_active)}
                    </MetaItem>
                    {userStats && (
                      <>
                        <MetaItem>
                          <FiDownload size={14} />
                          {t('todayDownloads', 'Today')}: {userStats.downloads_today}
                        </MetaItem>
                        <MetaItem>
                          <FiBook size={14} />
                          {t('totalDownloads', 'Total')}: {userStats.total_downloads}
                        </MetaItem>
                      </>
                    )}
                  </UserMeta>
                </UserInfo>
                
                {onViewUser && (
                  <ViewButton onClick={() => onViewUser(user.user_id)}>
                    <FiEye size={14} />
                    {t('view', 'View')}
                  </ViewButton>
                )}
              </UserItem>
            );
          })
        )}
      </UsersList>
    </PanelContainer>
  );
};

export default OnlineUsersPanel;
