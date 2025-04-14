import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiUser, FiClock, FiDownload, FiEdit, FiLogIn, FiKey, FiMessageSquare } from 'react-icons/fi';
import { getRecentActivities, ActivityLog, ActivityType } from '../../services/activityService';

// Styled components
const ActivityContainer = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.lg};
    transform: translateY(-5px);
  }
`;

const ActivityHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  h3 {
    font-size: ${props => props.theme.typography.fontSize.xl};
    color: ${props => props.theme.colors.primary};
    margin: 0;
    font-family: ${props => props.theme.typography.fontFamily.heading};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const ActivityList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const ActivityItem = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
  display: flex;
  align-items: center;
  gap: 1rem;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const IconContainer = styled.div<{ $activity?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  ${({ $activity, theme }) => {
    switch($activity) {
      case ActivityType.LOGIN:
        return `
          background-color: rgba(46, 204, 113, 0.1);
          color: ${theme.colors.success};
        `;
      case ActivityType.DOWNLOAD:
        return `
          background-color: rgba(52, 152, 219, 0.1);
          color: ${theme.colors.primary};
        `;
      case ActivityType.PROFILE_UPDATE:
        return `
          background-color: rgba(155, 89, 182, 0.1);
          color: #9b59b6;
        `;
      case ActivityType.PASSWORD_CHANGE:
        return `
          background-color: rgba(241, 196, 15, 0.1);
          color: #f1c40f;
        `;
      case ActivityType.BOOK_REQUEST:
        return `
          background-color: rgba(230, 126, 34, 0.1);
          color: #e67e22;
        `;
      default:
        return `
          background-color: rgba(149, 165, 166, 0.1);
          color: #95a5a6;
        `;
    }
  }}
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTitle = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const ActivityDetails = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textDim};
  margin-top: 0.25rem;
`;

const Username = styled.span`
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.primary};
`;

const TimeAgo = styled.span`
  font-size: ${props => props.theme.typography.fontSize.xs};
  color: ${props => props.theme.colors.textDim};
  margin-left: 0.5rem;
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

const RefreshButton = styled.button`
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.secondary};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.sm};
  margin-left: auto;
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  
  &:hover {
    background-color: ${props => props.theme.colors.secondary};
    color: ${props => props.theme.colors.card};
  }
`;

interface UserActivityPanelProps {
  limit?: number;
  title?: string;
  autoRefresh?: boolean;
}

const UserActivityPanel: React.FC<UserActivityPanelProps> = ({ 
  limit = 10,
  title = 'Recent Activity',
  autoRefresh = true
}) => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchActivities = async () => {
    setIsLoading(true);
    const data = await getRecentActivities(limit);
    setActivities(data);
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchActivities();
    
    // If autoRefresh is enabled, refresh every 60 seconds
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchActivities();
      }, 60000); // 1 minute
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [limit, autoRefresh]);
  
  const getActivityIcon = (activity: ActivityLog) => {
    switch(activity.action) {
      case ActivityType.LOGIN:
        return <FiLogIn size={18} />;
      case ActivityType.DOWNLOAD:
        return <FiDownload size={18} />;
      case ActivityType.PROFILE_UPDATE:
        return <FiEdit size={18} />;
      case ActivityType.PASSWORD_CHANGE:
        return <FiKey size={18} />;
      case ActivityType.BOOK_REQUEST:
        return <FiMessageSquare size={18} />;
      default:
        return <FiUser size={18} />;
    }
  };
  
  const getActivityTitle = (activity: ActivityLog) => {
    switch(activity.action) {
      case ActivityType.LOGIN:
        return t('activity.userLoggedIn', '{{username}} logged in', { username: activity.username });
      case ActivityType.DOWNLOAD:
        return t('activity.userDownloadedBook', '{{username}} downloaded {{book}}', { 
          username: activity.username,
          book: activity.entity_name || t('activity.aBook', 'a book')
        });
      case ActivityType.PROFILE_UPDATE:
        return t('activity.userUpdatedProfile', '{{username}} updated their profile', { 
          username: activity.username 
        });
      case ActivityType.PASSWORD_CHANGE:
        return t('activity.userChangedPassword', '{{username}} changed their password', { 
          username: activity.username 
        });
      case ActivityType.BOOK_REQUEST:
        return t('activity.userRequestedBook', '{{username}} requested a book', { 
          username: activity.username 
        });
      default:
        return t('activity.userPerformedAction', '{{username}} performed an action', { 
          username: activity.username 
        });
    }
  };
  
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return t('time.justNow', 'just now');
    } else if (diffMin < 60) {
      return t('time.minutesAgo', '{{count}} min ago', { count: diffMin });
    } else if (diffHour < 24) {
      return t('time.hoursAgo', '{{count}} hours ago', { count: diffHour });
    } else if (diffDay < 30) {
      return t('time.daysAgo', '{{count}} days ago', { count: diffDay });
    } else {
      // Format date
      return activityTime.toLocaleDateString();
    }
  };
  
  return (
    <ActivityContainer>
      <ActivityHeader>
        <h3>
          <FiClock /> 
          {title}
          <RefreshButton onClick={fetchActivities}>
            {t('common.refresh', 'Refresh')}
          </RefreshButton>
        </h3>
      </ActivityHeader>
      
      <ActivityList>
        {isLoading ? (
          <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
        ) : activities.length === 0 ? (
          <EmptyState>{t('activity.noActivity', 'No recent activity to display')}</EmptyState>
        ) : (
          activities.map(activity => (
            <ActivityItem key={activity.id}>
              <IconContainer $activity={activity.action}>
                {getActivityIcon(activity)}
              </IconContainer>
              <ActivityContent>
                <ActivityTitle>
                  {getActivityTitle(activity)}
                </ActivityTitle>
                <ActivityDetails>
                  <Username>{activity.username}</Username>
                  <TimeAgo>{formatTimeAgo(activity.created_at)}</TimeAgo>
                </ActivityDetails>
              </ActivityContent>
            </ActivityItem>
          ))
        )}
      </ActivityList>
    </ActivityContainer>
  );
};

export default UserActivityPanel;
