import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { 
  FiUser, 
  FiActivity, 
  FiDownload, 
  FiCalendar, 
  FiClock,
  FiArrowLeft,
  FiRefreshCw,
  FiGlobe,
  FiLogIn
} from 'react-icons/fi';
import { HiOutlineBan as FiBan } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { getUserActivities } from '../../services/activityService';
import { getUserDownloads } from '../../services/downloadService';
import { getUserIpLogs } from '../../services/ipTrackingService';
import { isUserBanned } from '../../services/userBanService';
import { getUserLastLogin } from '../../services/activityService';
import { countryCodeToEmoji } from '../../utils/flagUtils';
import { format } from 'date-fns';
import {
  AdminContainer,
  AdminHeader,
  AdminTitle,
  ActionButtons,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  LoadingState
} from '../../styles/adminStyles';

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  margin-right: 1rem;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAltHover};
  }
`;

const UserInfoCard = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.sm};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const UserAvatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.backgroundAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: ${props => props.theme.colors.textDim};
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserName = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: ${props => props.theme.typography.fontSize.xl};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
`;

const UserMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textDim};
`;

const BannedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  background-color: rgba(231, 76, 60, 0.1);
  color: ${props => props.theme.colors.danger};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  margin-left: 0.5rem;
`;

const AdminBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  background-color: rgba(52, 152, 219, 0.1);
  color: ${props => props.theme.colors.primary};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  margin-left: 0.5rem;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 1.5rem;
`;

const Tab = styled.button<{ active?: boolean }>`
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-bottom: 3px solid ${props => props.active 
    ? props.theme.colors.primary 
    : 'transparent'};
  color: ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.text};
  font-weight: ${props => props.active 
    ? props.theme.typography.fontWeight.semibold 
    : props.theme.typography.fontWeight.normal};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: 1.25rem;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const StatValue = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textDim};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionTimestamp = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xs};
  color: ${props => props.theme.colors.textDim};
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 0.75rem;
  background-color: ${props => props.active
    ? props.theme.colors.primary
    : props.theme.colors.backgroundAlt};
  color: ${props => props.active
    ? '#fff'
    : props.theme.colors.text};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background-color: ${props => props.active
      ? props.theme.colors.primaryDark
      : props.theme.colors.backgroundAltHover};
  }
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.textDim};
  border: 1px dashed ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
`;

// Types
type TabType = 'activity' | 'downloads' | 'ips';
type ActivityFilterType = 'all' | 'login' | 'download' | 'profile' | 'book';

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  entity_name?: string;
  entity_type?: string;
  details?: any;
}

interface DownloadLog {
  id: string;
  downloaded_at: string;
  book?: {
    id: string;
    title: string;
    author: string;
  };
}

interface IpLog {
  id: string;
  ip_address: string;
  created_at: string;
  user_agent?: string;
  country_code?: string;
}

interface UserData {
  id: string;
  username: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  is_admin: boolean;
  daily_quota: number;
  is_banned: boolean;
}

const UserActivityPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [activityFilter, setActivityFilter] = useState<ActivityFilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [downloads, setDownloads] = useState<DownloadLog[]>([]);
  const [ipLogs, setIpLogs] = useState<IpLog[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalDownloads: 0,
    uniqueIps: 0,
    lastActive: '',
    lastLogin: ''
  });
  
  useEffect(() => {
    if (!user || !userId) {
      navigate('/admin/users');
      return;
    }
    
    // Load user data, activities, downloads, and IP logs for stats
    fetchUserData();
    fetchActivities();
    fetchDownloads();
    fetchIpLogs();
  }, [user, userId, navigate]);
  
  useEffect(() => {
    // Load tab specific data when tab changes
    if (activeTab === 'downloads' && downloads.length === 0) {
      fetchDownloads();
    } else if (activeTab === 'ips' && ipLogs.length === 0) {
      fetchIpLogs();
    }
  }, [activeTab]);
  
  const fetchUserData = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      
      // Instead of using admin.getUserById, use the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        setIsLoading(false);
        return;
      }
      
      // Get the user's last active status from user_sessions
      const { data: sessionData } = await supabase
        .from('user_sessions')
        .select('last_active_at')
        .eq('user_id', userId)
        .order('last_active_at', { ascending: false })
        .limit(1)
        .single();
      
      // Check if user is banned
      const userBanned = await isUserBanned(userId);
      
      // Construct a user data object
      const user: UserData = {
        id: profileData.id,
        username: profileData.username,
        email: profileData.email || '',
        created_at: profileData.created_at,
        last_sign_in_at: profileData.last_sign_in || (sessionData?.last_active_at || null),
        is_admin: profileData.is_admin || false,
        daily_quota: profileData.daily_quota || 10,
        is_banned: userBanned
      };
      
      setUserData(user);
      // Use last active timestamp from sessions
      const lastActiveTs = sessionData?.last_active_at || '';
      setStats(prev => ({ ...prev, lastActive: lastActiveTs }));
      
      // Fetch actual last login timestamp, fallback to profile.last_sign_in
      let loginTs = await getUserLastLogin(userId);
      if (!loginTs && profileData.last_sign_in) {
        loginTs = profileData.last_sign_in;
      }
      setStats(prev => ({ ...prev, lastLogin: loginTs || '' }));
      
    } catch (error) {
      console.error('Exception fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchActivities = async () => {
    if (!userId) return;
    
    try {
      const activityLogs = await getUserActivities(userId, 50);
      setActivities(activityLogs);
      
      // Update stats count
      setStats(prev => ({
        ...prev,
        totalActivities: activityLogs.length
      }));
    } catch (error) {
      console.error('Error fetching user activities:', error);
    }
  };
  
  const fetchDownloads = async () => {
    if (!userId) return;
    
    try {
      const downloadLogs = await getUserDownloads(userId, 50);
      setDownloads(downloadLogs);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalDownloads: downloadLogs.length
      }));
    } catch (error) {
      console.error('Error fetching user downloads:', error);
    }
  };
  
  const fetchIpLogs = async () => {
    if (!userId) return;

    try {
      const ipLogsList = await getUserIpLogs(userId, 1000);
      // Filter out invalid or placeholder IPs (e.g., 0.0.0.0)
      const filteredLogs = ipLogsList.filter(log => log.ip_address !== '0.0.0.0');
      setIpLogs(filteredLogs);

      // Count unique IPs
      const uniqueIps = new Set(filteredLogs.map(log => log.ip_address));

      // Update stats
      setStats(prev => ({
        ...prev,
        uniqueIps: uniqueIps.size
      }));
    } catch (error) {
      console.error('Error fetching user IP logs:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };
  
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <FiUser />;
      case 'DOWNLOAD':
        return <FiDownload />;
      case 'PROFILE_UPDATE':
        return <FiUser />;
      case 'PASSWORD_CHANGE':
        return <FiUser />;
      case 'BOOK_REQUEST':
        return <FiDownload />;
      default:
        return <FiActivity />;
    }
  };
  
  const getActivityLabel = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return t('login', 'Login');
      case 'LOGOUT':
        return t('logout', 'Logout');
      case 'DOWNLOAD':
        return t('download', 'Download');
      case 'PROFILE_UPDATE':
        return t('profileUpdate', 'Profile Update');
      case 'PASSWORD_CHANGE':
        return t('passwordChange', 'Password Change');
      case 'BOOK_REQUEST':
        return t('bookRequest', 'Book Request');
      default:
        return action;
    }
  };
  
  const filterActivities = (activities: ActivityLog[]) => {
    if (activityFilter === 'all') return activities;
    
    return activities.filter(activity => {
      switch (activityFilter) {
        case 'login':
          return activity.action === 'LOGIN' || activity.action === 'LOGOUT';
        case 'download':
          return activity.action === 'DOWNLOAD';
        case 'profile':
          return activity.action === 'PROFILE_UPDATE' || activity.action === 'PASSWORD_CHANGE';
        case 'book':
          return activity.action === 'BOOK_REQUEST';
        default:
          return true;
      }
    });
  };
  
  const renderActivityTab = () => {
    const filteredActivities = filterActivities(activities);
    
    if (activities.length === 0) {
      return (
        <EmptyState>{t('noActivityFound', 'No activity records found for this user.')}</EmptyState>
      );
    }
    
    return (
      <>
        <FilterContainer>
          <FilterButton 
            active={activityFilter === 'all'} 
            onClick={() => setActivityFilter('all')}
          >
            <FiActivity />
            {t('allActivities', 'All Activities')}
          </FilterButton>
          <FilterButton 
            active={activityFilter === 'login'} 
            onClick={() => setActivityFilter('login')}
          >
            <FiUser />
            {t('loginActivities', 'Logins')}
          </FilterButton>
          <FilterButton 
            active={activityFilter === 'download'} 
            onClick={() => setActivityFilter('download')}
          >
            <FiDownload />
            {t('downloadActivities', 'Downloads')}
          </FilterButton>
          <FilterButton 
            active={activityFilter === 'profile'} 
            onClick={() => setActivityFilter('profile')}
          >
            <FiUser />
            {t('profileActivities', 'Profile')}
          </FilterButton>
          <FilterButton 
            active={activityFilter === 'book'} 
            onClick={() => setActivityFilter('book')}
          >
            <FiDownload />
            {t('bookActivities', 'Book Requests')}
          </FilterButton>
        </FilterContainer>
      
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{t('action', 'Action')}</TableHeader>
                <TableHeader>{t('details', 'Details')}</TableHeader>
                <TableHeader>{t('timestamp', 'Timestamp')}</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {filteredActivities.map(activity => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getActivityIcon(activity.action)}
                      {getActivityLabel(activity.action)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {activity.entity_name || 
                     (activity.details && JSON.stringify(activity.details)) || 
                     '-'}
                  </TableCell>
                  <TableCell>
                    <ActionTimestamp>{formatDate(activity.created_at)}</ActionTimestamp>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      </>
    );
  };
  
  const renderDownloadsTab = () => {
    if (downloads.length === 0) {
      return (
        <EmptyState>{t('noDownloadsFound', 'No download records found for this user.')}</EmptyState>
      );
    }
    
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>{t('book', 'Book')}</TableHeader>
              <TableHeader>{t('author', 'Author')}</TableHeader>
              <TableHeader>{t('downloadDate', 'Download Date')}</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {downloads.map(download => (
              <TableRow key={download.id}>
                <TableCell>{download.book?.title || t('unknownBook', 'Unknown Book')}</TableCell>
                <TableCell>{download.book?.author || '-'}</TableCell>
                <TableCell>
                  <ActionTimestamp>{formatDate(download.downloaded_at)}</ActionTimestamp>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    );
  };
  
  const renderIpsTab = () => {
    if (ipLogs.length === 0) {
      return (
        <EmptyState>{t('noIpsFound', 'No IP address records found for this user.')}</EmptyState>
      );
    }
    
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>{t('country', 'Country')}</TableHeader>
              <TableHeader>{t('ipAddress', 'IP Address')}</TableHeader>
              <TableHeader>{t('userAgent', 'User Agent')}</TableHeader>
              <TableHeader>{t('timestamp', 'Timestamp')}</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {ipLogs.map(ip => (
              <TableRow key={ip.id}>
                <TableCell>
                  {ip.country_code
                    ? countryCodeToEmoji(ip.country_code)
                    : <FiGlobe />}
                </TableCell>
                <TableCell>{ip.ip_address}</TableCell>
                <TableCell>{ip.user_agent || '-'}</TableCell>
                <TableCell>
                  <ActionTimestamp>{formatDate(ip.created_at)}</ActionTimestamp>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    );
  };
  
  if (isLoading) {
    return (
      <AdminContainer>
        <LoadingState>{t('loading', 'Loading...')}</LoadingState>
      </AdminContainer>
    );
  }
  
  if (!userData) {
    return (
      <AdminContainer>
        <EmptyState>{t('userNotFound', 'User not found')}</EmptyState>
      </AdminContainer>
    );
  }
  
  return (
    <AdminContainer>
      <AdminHeader>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <BackButton onClick={() => navigate('/admin/users')}>
            <FiArrowLeft />
            {t('backToUsers', 'Back to Users')}
          </BackButton>
          <AdminTitle>
            <FiUser />
            {t('userActivity', 'User Activity')}
          </AdminTitle>
        </div>
        <ActionButtons>
          <IconButton
            className="refresh"
            title={t('refresh', 'Refresh')}
            onClick={() => {
              fetchUserData();
              if (activeTab === 'activity') fetchActivities();
              else if (activeTab === 'downloads') fetchDownloads();
              else if (activeTab === 'ips') fetchIpLogs();
            }}
          >
            <FiRefreshCw />
          </IconButton>
        </ActionButtons>
      </AdminHeader>
      
      <UserInfoCard>
        <UserAvatar>
          {userData.username.charAt(0).toUpperCase()}
        </UserAvatar>
        <UserDetails>
          <UserName>
            {userData.username}
            {userData.is_admin && <AdminBadge>{t('admin', 'Admin')}</AdminBadge>}
            {userData.is_banned && <BannedBadge><FiBan size={12} /> {t('banned', 'Banned')}</BannedBadge>}
          </UserName>
          <UserMeta>
            <UserMetaItem>
              <FiCalendar size={14} />
              {t('joined', 'Joined')}: {formatDate(userData.created_at)}
            </UserMetaItem>
            {stats.lastActive && (
              <UserMetaItem>
                <FiClock size={14} />
                {t('lastActive', 'Last Active')}: {formatDate(stats.lastActive)}
              </UserMetaItem>
            )}
            {stats.lastLogin && (
              <UserMetaItem>
                <FiLogIn size={14} />
                {t('lastLogin', 'Last Login')}: {formatDate(stats.lastLogin)}
              </UserMetaItem>
            )}
            {userData.email && (
              <UserMetaItem>
                <FiUser size={14} />
                {userData.email}
              </UserMetaItem>
            )}
          </UserMeta>
        </UserDetails>
      </UserInfoCard>
      
      <StatsGrid>
        <StatCard>
          <StatValue>{stats.totalActivities}</StatValue>
          <StatLabel>
            <FiActivity size={16} />
            {t('totalActivities', 'Total Activities')}
          </StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.totalDownloads}</StatValue>
          <StatLabel>
            <FiDownload size={16} />
            {t('totalDownloads', 'Total Downloads')}
          </StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.uniqueIps}</StatValue>
          <StatLabel>
            <FiGlobe size={16} />
            {t('uniqueIPs', 'Unique IP Addresses')}
          </StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{userData.daily_quota}</StatValue>
          <StatLabel>
            <FiDownload size={16} />
            {t('dailyQuota', 'Daily Download Quota')}
          </StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.lastActive ? formatDate(stats.lastActive) : '-'}</StatValue>
          <StatLabel>
            <FiClock size={16} />
            {t('lastActive', 'Last Active')}
          </StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.lastLogin ? formatDate(stats.lastLogin) : '-'}</StatValue>
          <StatLabel>
            <FiLogIn size={16} />
            {t('lastLogin', 'Last Login')}
          </StatLabel>
        </StatCard>
      </StatsGrid>
      
      <TabContainer>
        <Tab 
          active={activeTab === 'activity'} 
          onClick={() => setActiveTab('activity')}
        >
          <FiActivity />
          {t('activity', 'Activity')}
        </Tab>
        <Tab 
          active={activeTab === 'downloads'} 
          onClick={() => setActiveTab('downloads')}
        >
          <FiDownload />
          {t('downloads', 'Downloads')}
        </Tab>
        <Tab 
          active={activeTab === 'ips'} 
          onClick={() => setActiveTab('ips')}
        >
          <FiGlobe />
          {t('ipAddresses', 'IP Addresses')}
        </Tab>
      </TabContainer>
      
      {activeTab === 'activity' && renderActivityTab()}
      {activeTab === 'downloads' && renderDownloadsTab()}
      {activeTab === 'ips' && renderIpsTab()}
    </AdminContainer>
  );
};

export default UserActivityPage;
