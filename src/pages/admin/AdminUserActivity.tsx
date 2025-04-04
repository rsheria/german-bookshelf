import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiUser, FiActivity, FiRefreshCw } from 'react-icons/fi';
import { getRecentActivities, ActivityLog } from '../../services/activityService';

// Styled components
const ActivityContainer = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  overflow: hidden;
`;

const ActivityHeader = styled.div`
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

const ActivityList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const ActivityItem = styled.div`
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

const ActivityUser = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActivityTime = styled.div`
  color: ${props => props.theme.colors.textDim};
  font-size: ${props => props.theme.typography.fontSize.sm};
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
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${props => props.theme.typography.fontSize.sm};
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.sm};
  
  &:hover {
    background-color: rgba(52, 152, 219, 0.1);
  }
  
  svg {
    transition: all 0.3s ease;
  }
  
  &:active svg {
    transform: rotate(180deg);
  }
`;

interface AdminUserActivityProps {
  limit?: number;
  title?: string;
  autoRefresh?: boolean;
}

const AdminUserActivity: React.FC<AdminUserActivityProps> = ({ 
  limit = 10,
  title = 'Recent User Activity',
  autoRefresh = true
}) => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchActivities = async () => {
    if (isRefreshing) return;
    
    setIsLoading(true);
    setIsRefreshing(true);
    
    try {
      const data = await getRecentActivities(limit);
      setActivities(data);
    } catch (error) {
      console.error('Error fetching user activities:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
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
  
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return t('time.justNow', 'Just now');
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
          <FiActivity />
          {title}
        </h3>
        <RefreshButton onClick={fetchActivities} disabled={isRefreshing}>
          <FiRefreshCw />
          {t('refresh', 'Refresh')}
        </RefreshButton>
      </ActivityHeader>
      
      <ActivityList>
        {isLoading ? (
          <LoadingState>{t('loading', 'Loading...')}</LoadingState>
        ) : activities.length === 0 ? (
          <EmptyState>{t('noActivity', 'No recent activity')}</EmptyState>
        ) : (
          activities.map(activity => (
            <ActivityItem key={activity.id}>
              <ActivityUser>
                <FiUser />
                {activity.username} - {activity.action}
              </ActivityUser>
              <ActivityTime>{formatTimeAgo(activity.created_at)}</ActivityTime>
            </ActivityItem>
          ))
        )}
      </ActivityList>
    </ActivityContainer>
  );
};

export default AdminUserActivity;
