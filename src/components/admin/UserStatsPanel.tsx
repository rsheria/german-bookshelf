import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { 
  FiDownload, 
  FiUsers, 
  FiCalendar, 
  FiBarChart2, 
  FiPieChart,
  FiTrendingUp
} from 'react-icons/fi';
import { getUserDownloadStats } from '../../services/downloadService';
import { getDownloadStats } from '../../services/downloadService';
import { getActivityStats } from '../../services/activityService';
import { UserDownloadStats } from '../../types/supabase';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const PanelContainer = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
`;

const PanelHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  h3 {
    font-size: ${props => props.theme.typography.fontSize.xl};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const PanelContent = styled.div`
  padding: 1.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  padding: 1.25rem;
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.sm};
  }
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  
  svg {
    color: ${props => props.theme.colors.primary};
    margin-right: 0.5rem;
  }
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xxl};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textDim};
`;

const LoadingState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.textDim};
`;

const ChartContainer = styled.div`
  margin-top: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  padding: 1.25rem;
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
`;

const ChartTitle = styled.h4`
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: ${props => props.theme.typography.fontSize.lg};
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

const TopUsersTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.5rem;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
`;

const TableCell = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
`;

const TableRow = styled.tr`
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const Username = styled.span`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

interface UserStatsPanelProps {
  className?: string;
}

type TabType = 'overview' | 'top-users' | 'activity';

const UserStatsPanel: React.FC<UserStatsPanelProps> = ({ className }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [downloadStats, setDownloadStats] = useState<{
    totalDownloads: number;
    downloadsToday: number;
    downloadsThisWeek: number;
    downloadsThisMonth: number;
    topBooks: { book_id: string; title: string; count: number }[];
  }>({
    totalDownloads: 0,
    downloadsToday: 0,
    downloadsThisWeek: 0,
    downloadsThisMonth: 0,
    topBooks: []
  });
  const [activityStats, setActivityStats] = useState<{
    today: number;
    week: number;
    month: number;
    byAction: Record<string, number>;
  }>({
    today: 0,
    week: 0,
    month: 0,
    byAction: {}
  });
  const [topUsers, setTopUsers] = useState<UserDownloadStats[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all stats in parallel
        const [downloadStatsData, activityStatsData, userStatsData] = await Promise.all([
          getDownloadStats(),
          getActivityStats(),
          getUserDownloadStats()
        ]);
        
        setDownloadStats(downloadStatsData);
        setActivityStats(activityStatsData);
        
        // Sort users by total downloads
        const sortedUsers = [...userStatsData].sort(
          (a, b) => b.total_downloads - a.total_downloads
        );
        setTopUsers(sortedUsers.slice(0, 10)); // Top 10 users
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Prepare chart data for activity by type
  const activityChartData = {
    labels: Object.keys(activityStats.byAction).map(key => {
      // Map action types to readable labels
      switch (key) {
        case 'LOGIN': return t('login', 'Login');
        case 'LOGOUT': return t('logout', 'Logout');
        case 'DOWNLOAD': return t('download', 'Download');
        case 'PROFILE_UPDATE': return t('profileUpdate', 'Profile Update');
        case 'PASSWORD_CHANGE': return t('passwordChange', 'Password Change');
        case 'BOOK_REQUEST': return t('bookRequest', 'Book Request');
        case 'ADMIN_ACTION': return t('adminAction', 'Admin Action');
        default: return key;
      }
    }),
    datasets: [
      {
        label: t('activities', 'Activities'),
        data: Object.values(activityStats.byAction),
        backgroundColor: [
          'rgba(52, 152, 219, 0.7)',  // Blue
          'rgba(46, 204, 113, 0.7)',  // Green
          'rgba(155, 89, 182, 0.7)',  // Purple
          'rgba(241, 196, 15, 0.7)',  // Yellow
          'rgba(230, 126, 34, 0.7)',  // Orange
          'rgba(231, 76, 60, 0.7)',   // Red
          'rgba(149, 165, 166, 0.7)'  // Gray
        ],
        borderColor: [
          'rgba(52, 152, 219, 1)',
          'rgba(46, 204, 113, 1)',
          'rgba(155, 89, 182, 1)',
          'rgba(241, 196, 15, 1)',
          'rgba(230, 126, 34, 1)',
          'rgba(231, 76, 60, 1)',
          'rgba(149, 165, 166, 1)'
        ],
        borderWidth: 1
      }
    ]
  };
  
  // Bar chart for top books
  const topBooksChartData = {
    labels: downloadStats.topBooks.map(book => book.title),
    datasets: [
      {
        label: t('downloads', 'Downloads'),
        data: downloadStats.topBooks.map(book => book.count),
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 1
      }
    ]
  };
  
  const renderOverviewTab = () => {
    return (
      <>
        <StatsGrid>
          <StatCard>
            <StatIcon>
              <FiDownload size={20} />
              {t('totalDownloads', 'Total Downloads')}
            </StatIcon>
            <StatValue>{downloadStats.totalDownloads}</StatValue>
            <StatLabel>{t('allTime', 'All Time')}</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatIcon>
              <FiCalendar size={20} />
              {t('todayDownloads', 'Today\'s Downloads')}
            </StatIcon>
            <StatValue>{downloadStats.downloadsToday}</StatValue>
            <StatLabel>{t('last24Hours', 'Last 24 Hours')}</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatIcon>
              <FiUsers size={20} />
              {t('activeUsers', 'Active Users')}
            </StatIcon>
            <StatValue>{topUsers.length}</StatValue>
            <StatLabel>{t('withDownloads', 'With Downloads')}</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatIcon>
              <FiBarChart2 size={20} />
              {t('activities', 'Activities')}
            </StatIcon>
            <StatValue>{activityStats.today}</StatValue>
            <StatLabel>{t('todayActivities', 'Today\'s Activities')}</StatLabel>
          </StatCard>
        </StatsGrid>
        
        <ChartContainer>
          <ChartCard>
            <ChartTitle>
              <FiPieChart />
              {t('activityByType', 'Activity by Type')}
            </ChartTitle>
            <Pie 
              data={activityChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </ChartCard>
          
          <ChartCard>
            <ChartTitle>
              <FiBarChart2 />
              {t('topDownloadedBooks', 'Top Downloaded Books')}
            </ChartTitle>
            <Bar 
              data={topBooksChartData}
              options={{
                indexAxis: 'y' as const,
                responsive: true,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  x: {
                    ticks: {
                      precision: 0
                    }
                  },
                  y: {
                    ticks: {
                      callback: function(value) {
                        const label = this.getLabelForValue(value as number);
                        if (label && label.length > 20) {
                          return label.substr(0, 20) + '...';
                        }
                        return label;
                      }
                    }
                  }
                }
              }}
            />
          </ChartCard>
        </ChartContainer>
      </>
    );
  };
  
  const renderTopUsersTab = () => {
    return (
      <TopUsersTable>
        <thead>
          <tr>
            <TableHeader>{t('username', 'Username')}</TableHeader>
            <TableHeader>{t('totalDownloads', 'Total Downloads')}</TableHeader>
            <TableHeader>{t('todayDownloads', 'Today')}</TableHeader>
            <TableHeader>{t('thisWeekDownloads', 'This Week')}</TableHeader>
            <TableHeader>{t('thisMonthDownloads', 'This Month')}</TableHeader>
          </tr>
        </thead>
        <tbody>
          {topUsers.map(user => (
            <TableRow key={user.user_id}>
              <TableCell>
                <Username>{user.username}</Username>
              </TableCell>
              <TableCell>{user.total_downloads}</TableCell>
              <TableCell>{user.downloads_today}</TableCell>
              <TableCell>{user.downloads_this_week}</TableCell>
              <TableCell>{user.downloads_this_month}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </TopUsersTable>
    );
  };
  
  const renderActivityTab = () => {
    // Activity growth over time
    const activityGrowthData = {
      labels: [t('today', 'Today'), t('thisWeek', 'This Week'), t('thisMonth', 'This Month')],
      datasets: [
        {
          label: t('activities', 'Activities'),
          data: [activityStats.today, activityStats.week, activityStats.month],
          backgroundColor: 'rgba(46, 204, 113, 0.7)',
          borderColor: 'rgba(46, 204, 113, 1)',
          borderWidth: 1
        }
      ]
    };
    
    return (
      <>
        <StatsGrid>
          <StatCard>
            <StatIcon>
              <FiTrendingUp size={20} />
              {t('todayActivities', 'Today\'s Activities')}
            </StatIcon>
            <StatValue>{activityStats.today}</StatValue>
            <StatLabel>{t('last24Hours', 'Last 24 Hours')}</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatIcon>
              <FiCalendar size={20} />
              {t('weekActivities', 'Week Activities')}
            </StatIcon>
            <StatValue>{activityStats.week}</StatValue>
            <StatLabel>{t('last7Days', 'Last 7 Days')}</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatIcon>
              <FiCalendar size={20} />
              {t('monthActivities', 'Month Activities')}
            </StatIcon>
            <StatValue>{activityStats.month}</StatValue>
            <StatLabel>{t('last30Days', 'Last 30 Days')}</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatIcon>
              <FiBarChart2 size={20} />
              {t('avgDailyActivities', 'Avg. Daily Activities')}
            </StatIcon>
            <StatValue>
              {activityStats.month > 0 
                ? Math.round(activityStats.month / 30) 
                : 0}
            </StatValue>
            <StatLabel>{t('basedOnMonthly', 'Based on Monthly')}</StatLabel>
          </StatCard>
        </StatsGrid>
        
        <ChartContainer>
          <ChartCard>
            <ChartTitle>
              <FiPieChart />
              {t('activityByType', 'Activity by Type')}
            </ChartTitle>
            <Pie 
              data={activityChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </ChartCard>
          
          <ChartCard>
            <ChartTitle>
              <FiBarChart2 />
              {t('activityGrowth', 'Activity Growth')}
            </ChartTitle>
            <Bar 
              data={activityGrowthData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </ChartCard>
        </ChartContainer>
      </>
    );
  };
  
  return (
    <PanelContainer className={className}>
      <PanelHeader>
        <h3>
          <FiBarChart2 />
          {t('userStats', 'User Statistics')}
        </h3>
      </PanelHeader>
      
      <TabContainer>
        <Tab 
          $active={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')}
        >
          <FiBarChart2 />
          {t('overview', 'Overview')}
        </Tab>
        <Tab 
          $active={activeTab === 'top-users'} 
          onClick={() => setActiveTab('top-users')}
        >
          <FiUsers />
          {t('topUsers', 'Top Users')}
        </Tab>
        <Tab 
          $active={activeTab === 'activity'} 
          onClick={() => setActiveTab('activity')}
        >
          <FiTrendingUp />
          {t('activityStats', 'Activity Stats')}
        </Tab>
      </TabContainer>
      
      <PanelContent>
        {isLoading ? (
          <LoadingState>{t('loading', 'Loading...')}</LoadingState>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'top-users' && renderTopUsersTab()}
            {activeTab === 'activity' && renderActivityTab()}
          </>
        )}
      </PanelContent>
    </PanelContainer>
  );
};

export default UserStatsPanel;
