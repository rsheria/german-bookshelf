import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUsers, FiBarChart2, FiBook, FiDownload, FiActivity, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import AdminUserActivity from './AdminUserActivity';
import OnlineUsersPanel from '../../components/admin/OnlineUsersPanel';
import UserStatsPanel from '../../components/admin/UserStatsPanel';
import { getActivityStats } from '../../services/activityService';
import { getDownloadStats } from '../../services/downloadService';
import { getSessionStats } from '../../services/onlineUserService';
import { supabase } from '../../services/supabase';
import {
  AdminContainer,
  AdminHeader,
  AdminTitle,
  ActionButtons,
  IconButton
} from '../../styles/adminStyles';

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-gap: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(6, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DashboardCard = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.sm};
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.md};
    transform: translateY(-5px);
  }
`;

const FullWidthCard = styled(DashboardCard)`
  grid-column: span 12;
  
  @media (max-width: 1200px) {
    grid-column: span 6;
  }
  
  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const HalfWidthCard = styled(DashboardCard)`
  grid-column: span 6;
  
  @media (max-width: 1200px) {
    grid-column: span 6;
  }
  
  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const QuarterWidthCard = styled(DashboardCard)`
  grid-column: span 3;
  
  @media (max-width: 1200px) {
    grid-column: span 3;
  }
  
  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-gap: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.sm};
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.md};
  }
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 1rem;
  background-color: rgba(63, 118, 156, 0.1);
  color: ${props => props.theme.colors.primary};
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textDim};
`;

interface StatChangeProps {
  positive?: boolean;
}

const StatChange = styled.div<StatChangeProps>`
  display: flex;
  align-items: center;
  font-size: ${props => props.theme.typography.fontSize.xs};
  color: ${props => props.positive ? props.theme.colors.success : props.theme.colors.danger};
  margin-top: 0.25rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.lg};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardContent = styled.div`
  padding: 1.5rem;
`;

const SystemAlertsList = styled.div`
  margin-top: 1rem;
`;

const AlertItem = styled.div`
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: rgba(241, 196, 15, 0.1);
  border-left: 4px solid ${props => props.theme.colors.warning};
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  svg {
    color: ${props => props.theme.colors.warning};
    flex-shrink: 0;
  }
`;

const AlertContent = styled.div`
  flex: 1;
`;

const AlertTitle = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  margin-bottom: 0.25rem;
`;

const AlertDescription = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textDim};
`;

const AlertMeta = styled.div`
  display: flex;
  font-size: ${props => props.theme.typography.fontSize.xs};
  color: ${props => props.theme.colors.textDim};
  margin-top: 0.5rem;
`;

const LoadingState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.textDim};
`;

interface TopBook {
  book_id: string;
  title: string;
  count: number;
}

interface DownloadStats {
  totalDownloads: number;
  downloadsToday: number;
  downloadsThisWeek: number;
  downloadsThisMonth: number;
  topBooks: TopBook[];
}

interface ActivityStats {
  today: number;
  week: number;
  month: number;
  byAction: Record<string, number>;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalBooks: number;
  totalDownloads: number;
}

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalBooks: 0,
    totalDownloads: 0
  });
  const [downloadStats, setDownloadStats] = useState<DownloadStats>({
    totalDownloads: 0,
    downloadsToday: 0,
    downloadsThisWeek: 0,
    downloadsThisMonth: 0,
    topBooks: []
  });
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    today: 0,
    week: 0,
    month: 0,
    byAction: {}
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch all the data in parallel
      const [userCount, bookCount, downloadStatsData, activityStatsData, onlineStatsData] = await Promise.all([
        fetchUserStats(),
        fetchBookCount(),
        getDownloadStats(),
        getActivityStats(),
        getSessionStats()
      ]);
      
      setStats({
        totalUsers: userCount || 0,
        activeUsers: onlineStatsData.activeUsers || 0,
        totalBooks: bookCount || 0,
        totalDownloads: downloadStatsData.totalDownloads || 0,
      });
      
      setActivityStats(activityStatsData);
      setDownloadStats(downloadStatsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error fetching user count:', error);
        return 0;
      }
      
      return count;
    } catch (error) {
      console.error('Exception fetching user count:', error);
      return 0;
    }
  };

  const fetchBookCount = async () => {
    try {
      const { count, error } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error fetching book count:', error);
        return 0;
      }
      
      return count;
    } catch (error) {
      console.error('Exception fetching book count:', error);
      return 0;
    }
  };

  const renderSystemAlerts = () => {
    return (
      <SystemAlertsList>
        {downloadStats.downloadsToday > 50 && (
          <AlertItem>
            <FiAlertCircle size={24} />
            <AlertContent>
              <AlertTitle>{t('highDownloadVolume', 'High Download Volume')}</AlertTitle>
              <AlertDescription>
                {t('highDownloadVolumeDesc', 'There are {{count}} downloads today, which is higher than usual.', { count: downloadStats.downloadsToday })}
              </AlertDescription>
              <AlertMeta>
                {t('detectedJustNow', 'Detected just now')}
              </AlertMeta>
            </AlertContent>
          </AlertItem>
        )}
        
        {stats.activeUsers > 20 && (
          <AlertItem>
            <FiAlertCircle size={24} />
            <AlertContent>
              <AlertTitle>{t('highActiveUsers', 'High Active Users')}</AlertTitle>
              <AlertDescription>
                {t('highActiveUsersDesc', 'There are {{count}} active users online now.', { count: stats.activeUsers })}
              </AlertDescription>
              <AlertMeta>
                {t('detectedJustNow', 'Detected just now')}
              </AlertMeta>
            </AlertContent>
          </AlertItem>
        )}
      </SystemAlertsList>
    );
  };

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          <FiBarChart2 />
          {t('adminDashboard', 'Admin Dashboard')}
        </AdminTitle>
        <ActionButtons>
          <IconButton 
            className="refresh"
            title={t('refresh', 'Refresh')}
            onClick={fetchDashboardData}
          >
            <FiRefreshCw />
          </IconButton>
        </ActionButtons>
      </AdminHeader>

      {isLoading ? (
        <LoadingState>{t('loading', 'Loading...')}</LoadingState>
      ) : (
        <>
          <StatsGrid>
            <StatCard>
              <StatIcon>
                <FiUsers />
              </StatIcon>
              <StatContent>
                <StatValue>{stats.totalUsers}</StatValue>
                <StatLabel>{t('totalUsers', 'Total Users')}</StatLabel>
                <StatChange positive={true}>
                  {activityStats.today > 5 && `+${Math.round(activityStats.today / 10)} ${t('today', 'today')}`}
                </StatChange>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon>
                <FiBook />
              </StatIcon>
              <StatContent>
                <StatValue>{stats.totalBooks}</StatValue>
                <StatLabel>{t('totalBooks', 'Total Books')}</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon>
                <FiDownload />
              </StatIcon>
              <StatContent>
                <StatValue>{stats.totalDownloads}</StatValue>
                <StatLabel>{t('totalDownloads', 'Total Downloads')}</StatLabel>
                <StatChange positive={true}>
                  {downloadStats.downloadsToday > 0 && `+${downloadStats.downloadsToday} ${t('today', 'today')}`}
                </StatChange>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon>
                <FiActivity />
              </StatIcon>
              <StatContent>
                <StatValue>{activityStats.today}</StatValue>
                <StatLabel>{t('todayActivities', 'Today\'s Activities')}</StatLabel>
              </StatContent>
            </StatCard>
          </StatsGrid>
          
          <DashboardGrid>
            <QuarterWidthCard>
              <CardContent>
                <SectionHeader>
                  <SectionTitle>
                    <FiAlertCircle />
                    {t('systemAlerts', 'System Alerts')}
                  </SectionTitle>
                </SectionHeader>
                {renderSystemAlerts()}
              </CardContent>
            </QuarterWidthCard>
            
            <HalfWidthCard>
              <OnlineUsersPanel 
                refreshInterval={60000} 
                maxUsers={5} 
                onViewUser={(userId) => navigate(`/admin/users?userId=${userId}`)}
              />
            </HalfWidthCard>
            
            <QuarterWidthCard>
              <AdminUserActivity 
                limit={10} 
                title={t('recentActivity', 'Recent Activity')} 
                autoRefresh={true} 
              />
            </QuarterWidthCard>
            
            <FullWidthCard>
              <UserStatsPanel />
            </FullWidthCard>
          </DashboardGrid>
        </>
      )}
    </AdminContainer>
  );
};

export default AdminDashboardPage;
