import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUsers, FiEdit, FiCheck, FiX, FiSearch, FiDownload, FiCalendar, FiBarChart2, FiPieChart, FiActivity } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Profile } from '../../types/supabase';
import AdminUserActivity from './AdminUserActivity';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  AdminContainer,
  AdminHeader,
  AdminTitle,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  LoadingState,
  EmptyState,
  ActionButtons,
  IconButton,
  PageButton,
  SearchBar,
  SearchInput,
  SectionTitle,
  Pagination
} from '../../styles/adminStyles';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StatsSection = styled.div`
  margin-bottom: 2rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 1rem;
  background-color: rgba(63, 118, 156, 0.1);
  color: ${props => props.theme.colors.primary};
  
  svg {
    width: 20px;
    height: 20px;
  }
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

const ChartContainer = styled.div`
  height: 400px;
  margin-top: 1rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};
`;

const UserStatsOverview = styled.div`
  padding: 1.5rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.md};
  margin-top: 1rem;
  
  p {
    margin-bottom: 1rem;
    line-height: 1.6;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Tab = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  background-color: ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.backgroundAlt};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.text};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.active 
      ? props.theme.colors.primary 
      : props.theme.colors.backgroundAltHover};
    transform: translateY(-2px);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SectionToggle = styled.button`
  padding: 0.25rem 0.5rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAltHover};
    transform: translateY(-2px);
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const FilterButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  background-color: ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.backgroundAlt};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.text};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.active 
      ? props.theme.colors.primary 
      : props.theme.colors.backgroundAltHover};
    transform: translateY(-2px);
  }
`;

const DateFilterContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const DateInput = styled.input`
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAltHover};
    transform: translateY(-2px);
  }
`;

const ExportButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAltHover};
    transform: translateY(-2px);
  }
`;

const QuotaInput = styled.input`
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAltHover};
    transform: translateY(-2px);
  }
`;

const Badge = styled.span<{ variant: 'admin' | 'user' }>`
  padding: 0.25rem 0.5rem;
  background-color: ${props => props.variant === 'admin' 
    ? props.theme.colors.primary 
    : props.theme.colors.backgroundAlt};
  color: ${props => props.variant === 'admin' 
    ? 'white' 
    : props.theme.colors.text};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.variant === 'admin' 
      ? props.theme.colors.primary 
      : props.theme.colors.backgroundAltHover};
    transform: translateY(-2px);
  }
`;

const SafeToggleAdminButton = styled.button<{ $isAdmin: boolean }>`
  padding: 0.5rem 1rem;
  background-color: ${props => props.$isAdmin 
    ? props.theme.colors.backgroundAlt 
    : props.theme.colors.primary};
  color: ${props => props.$isAdmin 
    ? props.theme.colors.text 
    : 'white'};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.$isAdmin 
      ? props.theme.colors.backgroundAltHover 
      : props.theme.colors.primary};
    transform: translateY(-2px);
  }
`;

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const StatusMessage = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1rem;
`;

const PageInfo = styled.div`
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1rem;
`;

const PageButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

interface UserWithEmail extends Profile {
  email?: string;
  last_sign_in?: string;
}

interface EditingUser {
  id: string;
  daily_quota: number;
  monthly_request_quota: number;
}

interface UserStats {
  totalUsers: number;
  adminUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  averageDailyQuota: number;
}

type UserRole = 'all' | 'admin' | 'user';
type StatsTab = 'overview' | 'recentActivity' | 'userGrowth';

const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  
  // New filters
  const [roleFilter, setRoleFilter] = useState<UserRole>('all');
  const [dateRange, setDateRange] = useState<{from: string; to: string}>({
    from: '',
    to: ''
  });
  
  // Stats and activity tracking
  const [showStats, setShowStats] = useState(true);
  const [statsTab, setStatsTab] = useState<StatsTab>('overview');
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    adminUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    averageDailyQuota: 0
  });
  const [userGrowthData, setUserGrowthData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
    }[];
  }>({
    labels: [],
    datasets: [{
      label: t('newUsers', 'New Users'),
      data: [],
      backgroundColor: 'rgba(63, 118, 156, 0.2)',
      borderColor: 'rgba(63, 118, 156, 1)'
    }]
  });
  
  const limit = 10;

  useEffect(() => {
    // Redirect if not admin
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
      fetchUserStats();
      fetchUserGrowthData();
    }
  }, [user, isAdmin, searchTerm, page, roleFilter, dateRange]);

  const fetchUsers = async () => {
    if (!user || !isAdmin) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (searchTerm) {
        query = query.or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      // Role filter
      if (roleFilter === 'admin') {
        query = query.eq('is_admin', true);
      } else if (roleFilter === 'user') {
        query = query.eq('is_admin', false);
      }
      
      // Date range filter
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from);
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to);
      }
      
      // Apply pagination
      const from = page * limit;
      const to = from + limit - 1;
      
      const { data, error: fetchError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (fetchError) {
        throw fetchError;
      }
      
      setUsers(data || []);
      setFilteredUsers(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchUserStats = async () => {
    if (!user || !isAdmin) return;
    
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get admin users
      const { count: adminUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', true);
      
      // Get active users (last sign in within 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in', thirtyDaysAgo.toISOString());
      
      // Get new users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      // Get new users this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const { count: newUsersThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());
      
      // Get new users this month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const { count: newUsersThisMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneMonthAgo.toISOString());
      
      // Get average daily quota
      const { data: quotaData } = await supabase
        .from('profiles')
        .select('daily_quota');
      
      let totalQuota = 0;
      if (quotaData) {
        quotaData.forEach(item => {
          totalQuota += item.daily_quota;
        });
      }
      
      const averageDailyQuota = quotaData?.length 
        ? parseFloat((totalQuota / quotaData.length).toFixed(2)) 
        : 0;
      
      setUserStats({
        totalUsers: totalUsers || 0,
        adminUsers: adminUsers || 0,
        activeUsers: activeUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        averageDailyQuota
      });
      
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };
  
  const fetchUserGrowthData = async () => {
    // For user growth data, we'll query the profiles table by month
    try {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      const currentMonth = new Date().getMonth();
      const labels = [];
      const data = [];
      
      // Get data for the last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        labels.push(months[monthIndex]);
        
        // Calculate start and end of that month
        const year = new Date().getFullYear() - (monthIndex > currentMonth ? 1 : 0);
        const month = monthIndex;
        
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0); // Last day of month
        
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        
        data.push(count || 0);
      }
      
      setUserGrowthData({
        labels,
        datasets: [{
          label: t('newUsers', 'New Users'),
          data,
          backgroundColor: 'rgba(63, 118, 156, 0.2)',
          borderColor: 'rgba(63, 118, 156, 1)'
        }]
      });
    } catch (error) {
      console.error('Error fetching user growth data:', error);
    }
  };
  
  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      setError(null);
      setSuccess(null);
      
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: !currentIsAdmin })
        .eq('id', userId);
      
      if (updateError) {
        throw updateError;
      }
      
      setSuccess(currentIsAdmin 
        ? t('adminRightsRemoved') 
        : t('adminRightsGranted'));
      
      // Refresh user list
      fetchUsers();
      fetchUserStats();
    } catch (err) {
      console.error('Error updating admin status:', err);
      setError((err as Error).message);
    }
  };
  
  const handleEditQuota = (userId: string, currentQuota: number, monthlyRequestQuota: number) => {
    setEditingUser({ id: userId, daily_quota: currentQuota, monthly_request_quota: monthlyRequestQuota });
  };
  
  const handleSaveQuota = async () => {
    if (!editingUser) return;
    
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Use the new RPC function we created
      const { error } = await supabase.rpc('update_user_quota', {
        p_user_id: editingUser.id,
        p_daily_quota: editingUser.daily_quota,
        p_monthly_request_quota: editingUser.monthly_request_quota
      });
      
      if (error) {
        console.error('Error updating user quota:', error);
        setError(error.message);
      } else {
        setSuccess(t('quotaUpdated', 'User quota updated successfully'));
        
        // Update the user in the current list
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === editingUser.id 
              ? { 
                  ...user, 
                  daily_quota: editingUser.daily_quota,
                  monthly_request_quota: editingUser.monthly_request_quota 
                } 
              : user
          )
        );
        
        // Update the filtered list as well
        setFilteredUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === editingUser.id 
              ? { 
                  ...user, 
                  daily_quota: editingUser.daily_quota,
                  monthly_request_quota: editingUser.monthly_request_quota 
                } 
              : user
          )
        );
        
        // Clear the editing state
        setEditingUser(null);
        
        // Refresh the user stats
        fetchUserStats();
      }
    } catch (err) {
      console.error('Exception updating user quota:', err);
      setError((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleExportUsers = () => {
    // Convert users data to CSV format
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add headers
    csvContent += "ID,Username,Email,Role,Daily Quota,Monthly Quota,Created At,Last Sign In\n";
    
    // Add data rows
    users.forEach(userProfile => {
      const row = [
        userProfile.id,
        userProfile.username,
        userProfile.email || '-',
        userProfile.is_admin ? 'Admin' : 'User',
        userProfile.daily_quota,
        userProfile.monthly_request_quota,
        userProfile.created_at,
        userProfile.last_sign_in || '-'
      ].join(',');
      csvContent += row + "\n";
    });
    
    // Create download link and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportAllUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // Fetch all users without pagination
      let query = supabase
        .from('profiles')
        .select('*');
      
      // Apply the same filters as current view
      if (roleFilter === 'admin') {
        query = query.eq('is_admin', true);
      } else if (roleFilter === 'user') {
        query = query.eq('is_admin', false);
      }
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Convert all users data to CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      csvContent += "ID,Username,Email,Role,Daily Quota,Monthly Quota,Created At,Last Sign In\n";
      
      // Add data rows
      data?.forEach(userProfile => {
        const row = [
          userProfile.id,
          userProfile.username,
          userProfile.email || '-',
          userProfile.is_admin ? 'Admin' : 'User',
          userProfile.daily_quota,
          userProfile.monthly_request_quota,
          userProfile.created_at,
          userProfile.last_sign_in || '-'
        ].join(',');
        csvContent += row + "\n";
      });
      
      // Create download link and trigger download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `all-users-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Error exporting all users:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderStatsSection = () => {
    if (!showStats) return null;
    
    return (
      <StatsSection>
        <SectionHeader>
          <SectionTitle>{t('userStatistics', 'User Statistics')}</SectionTitle>
          <SectionToggle onClick={() => setShowStats(false)}>
            {t('hide', 'Hide')}
          </SectionToggle>
        </SectionHeader>
        
        <StatsGrid>
          <StatCard>
            <StatIcon>
              <FiUsers />
            </StatIcon>
            <StatContent>
              <StatValue>{userStats.totalUsers}</StatValue>
              <StatLabel>{t('totalUsers', 'Total Users')}</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard>
            <StatIcon style={{ color: '#3498db' }}>
              <FiActivity />
            </StatIcon>
            <StatContent>
              <StatValue>{userStats.activeUsers}</StatValue>
              <StatLabel>{t('activeUsers', 'Active Users')}</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard>
            <StatIcon style={{ color: '#2ecc71' }}>
              <FiUsers />
            </StatIcon>
            <StatContent>
              <StatValue>{userStats.newUsersToday}</StatValue>
              <StatLabel>{t('newUsersToday', 'New Today')}</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard>
            <StatIcon style={{ color: '#f39c12' }}>
              <FiUsers />
            </StatIcon>
            <StatContent>
              <StatValue>{userStats.newUsersThisWeek}</StatValue>
              <StatLabel>{t('newUsersWeek', 'New This Week')}</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard>
            <StatIcon style={{ color: '#e74c3c' }}>
              <FiUsers />
            </StatIcon>
            <StatContent>
              <StatValue>{userStats.newUsersThisMonth}</StatValue>
              <StatLabel>{t('newUsersMonth', 'New This Month')}</StatLabel>
            </StatContent>
          </StatCard>
          
          <StatCard>
            <StatIcon style={{ color: '#9b59b6' }}>
              <FiDownload />
            </StatIcon>
            <StatContent>
              <StatValue>{userStats.averageDailyQuota}</StatValue>
              <StatLabel>{t('averageQuota', 'Avg. Daily Quota')}</StatLabel>
            </StatContent>
          </StatCard>
        </StatsGrid>
        
        <TabContainer>
          <Tab 
            active={statsTab === 'overview'} 
            onClick={() => setStatsTab('overview')}
          >
            <FiBarChart2 /> {t('overview', 'Overview')}
          </Tab>
          <Tab 
            active={statsTab === 'recentActivity'} 
            onClick={() => setStatsTab('recentActivity')}
          >
            <FiActivity /> {t('recentActivity', 'Recent Activity')}
          </Tab>
          <Tab 
            active={statsTab === 'userGrowth'} 
            onClick={() => setStatsTab('userGrowth')}
          >
            <FiPieChart /> {t('userGrowth', 'User Growth')}
          </Tab>
        </TabContainer>
        
        {statsTab === 'overview' && (
          <UserStatsOverview>
            <p>{t('userStatsOverview', 'Your platform has {{totalUsers}} total users, with {{activeUsers}} active users in the last 30 days. {{adminCount}} users have admin privileges.', {
              totalUsers: userStats.totalUsers,
              activeUsers: userStats.activeUsers,
              adminCount: userStats.adminUsers
            })}</p>
            <p>{t('growthStats', 'You have {{newToday}} new users today, {{newWeek}} this week, and {{newMonth}} this month.', {
              newToday: userStats.newUsersToday,
              newWeek: userStats.newUsersThisWeek,
              newMonth: userStats.newUsersThisMonth
            })}</p>
          </UserStatsOverview>
        )}
        
        {statsTab === 'recentActivity' && (
          <AdminUserActivity 
            title={t('userActivity', 'User Activity')}
            limit={8}
            autoRefresh={true}
          />
        )}
        
        {statsTab === 'userGrowth' && (
          <ChartContainer>
            <Bar 
              data={userGrowthData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: t('newUsersByMonth', 'New Users by Month')
                  },
                },
              }}
            />
          </ChartContainer>
        )}
      </StatsSection>
    );
  };

  if (authLoading || isLoading) {
    return (
      <AdminContainer>
        <LoadingState>{t('loading')}</LoadingState>
      </AdminContainer>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect to home
  }

  const totalPages = Math.ceil(totalCount / limit);

  const renderPagination = () => {
    const buttons = [];
    
    // Previous button
    buttons.push(
      <PageButton 
        key="prev" 
        onClick={() => setPage(prev => Math.max(0, prev - 1))}
        disabled={page === 0}
      >
        &laquo;
      </PageButton>
    );
    
    // Page numbers
    const startPage = Math.max(0, page - 2);
    const endPage = Math.min(totalPages - 1, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <PageButton 
          key={i} 
          active={i === page}
          onClick={() => setPage(i)}
        >
          {i + 1}
        </PageButton>
      );
    }
    
    // Next button
    buttons.push(
      <PageButton 
        key="next" 
        onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
        disabled={page >= totalPages - 1}
      >
        &raquo;
      </PageButton>
    );
    
    return buttons;
  };

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          <FiUsers style={{ marginRight: '0.5rem' }} /> {t('manageUsers', 'Manage Users')}
        </AdminTitle>
        
        <SearchBar>
          <SearchInput
            type="text"
            placeholder={t('searchUsers', 'Search users...')} 
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchTerm(e.target.value);
              setPage(0); // Reset to first page on search
            }}
          />
          <IconButton aria-label={t('search')}>
            <FiSearch />
          </IconButton>
        </SearchBar>
      </AdminHeader>
      
      {error && (
        <StatusMessage>
          <FiX /> {error}
        </StatusMessage>
      )}
      
      {success && (
        <SuccessMessage>
          <FiCheck /> {success}
        </SuccessMessage>
      )}
      
      {/* User Statistics Section */}
      {renderStatsSection()}
      
      {/* Filters */}
      <FilterContainer>
        <FilterButton 
          active={roleFilter === 'all'} 
          onClick={() => setRoleFilter('all')}
        >
          <FiUsers /> {t('allUsers')}
        </FilterButton>
        <FilterButton 
          active={roleFilter === 'admin'} 
          onClick={() => setRoleFilter('admin')}
        >
          <FiUsers /> {t('adminUsers')}
        </FilterButton>
        <FilterButton 
          active={roleFilter === 'user'} 
          onClick={() => setRoleFilter('user')}
        >
          <FiUsers /> {t('regularUsers')}
        </FilterButton>
        
        <DateFilterContainer>
          <FiCalendar />
          <DateInput 
            type="date"
            value={dateRange.from}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setDateRange(prev => ({ ...prev, from: e.target.value }))
            }
            placeholder={t('dateFrom')}
          />
          <span>-</span>
          <DateInput 
            type="date"
            value={dateRange.to}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setDateRange(prev => ({ ...prev, to: e.target.value }))
            }
            placeholder={t('dateTo')}
          />
        </DateFilterContainer>
        
        <ExportButton onClick={handleExportUsers}>
          <FiDownload /> {t('exportCurrentUsers')}
        </ExportButton>
        
        <ExportButton onClick={handleExportAllUsers}>
          <FiDownload /> {t('exportAllUsers')}
        </ExportButton>
      </FilterContainer>
      
      {filteredUsers.length > 0 ? (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('username')}</TableHeader>
                  <TableHeader>{t('email')}</TableHeader>
                  <TableHeader>{t('role')}</TableHeader>
                  <TableHeader>{t('quota')}</TableHeader>
                  <TableHeader>{t('requestQuota', 'Monthly Requests')}</TableHeader>
                  <TableHeader>{t('actions')}</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {filteredUsers.map((userProfile) => (
                  <TableRow key={userProfile.id}>
                    <TableCell>{userProfile.username}</TableCell>
                    <TableCell>{userProfile.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={userProfile.is_admin ? 'admin' : 'user'}>
                        {userProfile.is_admin ? t('adminRole') : t('userRole')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingUser && editingUser.id === userProfile.id ? (
                        <QuotaInput
                          type="number"
                          min="0"
                          max="100"
                          value={editingUser.daily_quota}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setEditingUser({
                              ...editingUser,
                              daily_quota: parseInt(e.target.value) || 0
                            })
                          }
                        />
                      ) : (
                        userProfile.daily_quota
                      )}
                    </TableCell>
                    <TableCell>
                      {editingUser && editingUser.id === userProfile.id ? (
                        <QuotaInput
                          type="number"
                          min="0"
                          max="100"
                          value={editingUser.monthly_request_quota}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setEditingUser({
                              ...editingUser,
                              monthly_request_quota: parseInt(e.target.value) || 0
                            })
                          }
                        />
                      ) : (
                        userProfile.monthly_request_quota
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionButtons>
                        {editingUser && editingUser.id === userProfile.id ? (
                          <>
                            <IconButton 
                              className="save"
                              title={t('save')}
                              onClick={handleSaveQuota}
                              disabled={isUpdating}
                            >
                              {isUpdating ? '...' : <FiCheck />}
                            </IconButton>
                            <IconButton 
                              className="cancel"
                              title={t('cancel')}
                              onClick={() => setEditingUser(null)}
                              disabled={isUpdating}
                            >
                              <FiX />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton 
                            className="edit"
                            title={t('editQuota')}
                            onClick={() => handleEditQuota(userProfile.id, userProfile.daily_quota, userProfile.monthly_request_quota)}
                          >
                            <FiEdit />
                          </IconButton>
                        )}
                        
                        {/* Don't allow toggling admin status for current user */}
                        {userProfile.id !== user.id && (
                          <SafeToggleAdminButton 
                            $isAdmin={userProfile.is_admin}
                            onClick={() => handleToggleAdmin(userProfile.id, userProfile.is_admin)}
                          >
                            {userProfile.is_admin ? (
                              <>
                                <FiX /> {t('removeAdmin')}
                              </>
                            ) : (
                              <>
                                <FiCheck /> {t('makeAdmin')}
                              </>
                            )}
                          </SafeToggleAdminButton>
                        )}
                      </ActionButtons>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </TableContainer>
          
          {totalPages > 1 && (
            <Pagination>
              <PageInfo>
                {t('showing')} {page * limit + 1} - {Math.min((page + 1) * limit, totalCount)} {t('of')} {totalCount} {t('results')}
              </PageInfo>
              <PageButtons>
                {renderPagination()}
              </PageButtons>
            </Pagination>
          )}
        </>
      ) : (
        <EmptyState>
          {searchTerm 
            ? t('noMatchingUsers') 
            : t('noUsers')}
        </EmptyState>
      )}
    </AdminContainer>
  );
};

export default AdminUsersPage;
