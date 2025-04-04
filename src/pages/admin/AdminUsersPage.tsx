import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUsers, FiEdit, FiCheck, FiX, FiSearch, FiDownload, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Profile } from '../../types/supabase';
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
  LoadingState
} from '../../styles/adminStyles';

// Additional styled components specific to this page
const SearchBar = styled.div`
  display: flex;
  gap: 0.5rem;
  flex: 1;
  max-width: 500px;

  input {
    flex: 1;
    padding: 0.625rem 1rem;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.borderRadius.md};
    font-size: ${props => props.theme.typography.fontSize.base};
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.colors.card};
    transition: all 0.2s;
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary};
      box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
    }
  }
`;

const Badge = styled.span<{ variant?: 'admin' | 'user' }>`
  padding: 0.25rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  display: inline-flex;
  align-items: center;
  
  ${props => {
    switch(props.variant) {
      case 'admin':
        return `
          background-color: rgba(63, 118, 156, 0.1);
          color: ${props.theme.colors.primary};
        `;
      case 'user':
        return `
          background-color: rgba(149, 165, 166, 0.1);
          color: #7f8c8d;
        `;
      default:
        return `
          background-color: ${props.theme.colors.backgroundAlt};
          color: ${props.theme.colors.text};
        `;
    }
  }}
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${props => props.theme.borderRadius.full};
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.textDim};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
    color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
  }
  
  &.edit:hover {
    color: ${props => props.theme.colors.primary};
    border-color: ${props => props.theme.colors.primary};
    background-color: rgba(63, 118, 156, 0.05);
  }
  
  &.save:hover {
    color: ${props => props.theme.colors.success};
    border-color: ${props => props.theme.colors.success};
    background-color: rgba(40, 167, 69, 0.05);
  }
  
  &.cancel:hover {
    color: ${props => props.theme.colors.danger};
    border-color: ${props => props.theme.colors.danger};
    background-color: rgba(220, 53, 69, 0.05);
  }
`;

const SafeToggleAdminButton = styled.button<{ $isAdmin: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  border: none;
  background-color: ${props => props.$isAdmin 
    ? props.theme.colors.danger 
    : props.theme.colors.success};
  color: white;
  font-size: ${props => props.theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    opacity: 0.9;
  }
`;

const QuotaInput = styled.input`
  width: 70px;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.card};
  color: ${props => props.theme.colors.text};
  text-align: center;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
`;

const PageInfo = styled.div`
  color: ${props => props.theme.colors.textDim};
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

const PageButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const PageButton = styled.button<{ active?: boolean }>`
  min-width: 36px;
  height: 36px;
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  background-color: ${props => props.active 
    ? props.theme.colors.primary 
    : 'transparent'};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not([disabled]) {
    background-color: ${props => props.active 
      ? props.theme.colors.primaryDark 
      : props.theme.colors.backgroundAlt};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(220, 53, 69, 0.1);
  color: ${props => props.theme.colors.danger};
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1.5rem;
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(40, 167, 69, 0.1);
  color: ${props => props.theme.colors.success};
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.colors.textDim};
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.lg};
  margin-top: 1.5rem;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.625rem 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.base};
  color: ${props => props.theme.colors.text};
  background-color: ${props => props.theme.colors.card};
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
  }
`;

const FilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const FilterButton = styled.button<{ active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.backgroundAlt};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.text};
  border: 1px solid ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.active 
      ? props.theme.colors.primaryDark 
      : props.theme.colors.background};
    transform: translateY(-2px);
  }
`;

const DropdownFilter = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
  }
`;

const DateFilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DateInput = styled.input`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.sm};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
  }
`;

const ExportButton = styled(FilterButton)`
  margin-left: auto;
  background-color: ${props => props.theme.colors.success};
  color: white;
  border-color: ${props => props.theme.colors.success};
  
  &:hover {
    background-color: ${props => props.theme.colors.successDark || '#218838'};
    border-color: ${props => props.theme.colors.successDark || '#218838'};
  }
`;

// Stats visualization components
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
  border: 1px solid ${props => props.theme.colors.border};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme.shadows.md};
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  color: ${props => props.theme.colors.primary};
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.textDim};
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

const ChartContainer = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.sm};
  border: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 1.5rem;
  height: 300px;
`;

const ChartTitle = styled.h3`
  font-size: ${props => props.theme.typography.fontSize.lg};
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.textDark};
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
  border: 1px solid ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.active 
      ? props.theme.colors.primaryDark 
      : props.theme.colors.background};
  }
`;

const UserActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
`;

const ActivityItem = styled.div`
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:hover {
    background-color: ${props => props.theme.colors.background};
  }
`;

const ActivityUser = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const ActivityTime = styled.div`
  color: ${props => props.theme.colors.textDim};
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  font-size: ${props => props.theme.typography.fontSize.xl};
  color: ${props => props.theme.colors.textDark};
  margin: 0;
`;

const SectionToggle = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.sm};
  
  &:hover {
    background-color: rgba(63, 118, 156, 0.05);
  }
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

interface UserActivity {
  id: string;
  username: string;
  action: string;
  timestamp: string;
}

type UserRole = 'all' | 'admin' | 'user';
type ActivityFilter = 'all' | 'active' | 'inactive';
type QuotaFilter = 'all' | 'high' | 'low';
type StatsTab = 'overview' | 'activity' | 'growth';

const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  
  // New filters
  const [roleFilter, setRoleFilter] = useState<UserRole>('all');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [quotaFilter, setQuotaFilter] = useState<QuotaFilter>('all');
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
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
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
      label: t('admin.newUsers'),
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
      fetchUserActivity();
      fetchUserGrowthData();
    }
  }, [user, isAdmin, searchTerm, page, roleFilter, activityFilter, quotaFilter, dateRange]);

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
      
      // Activity filter
      if (activityFilter === 'active') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('last_sign_in', thirtyDaysAgo.toISOString());
      } else if (activityFilter === 'inactive') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.or(`last_sign_in.lt.${thirtyDaysAgo.toISOString()},last_sign_in.is.null`);
      }
      
      // Quota filter
      if (quotaFilter === 'high') {
        query = query.gte('daily_quota', 5);
      } else if (quotaFilter === 'low') {
        query = query.lt('daily_quota', 5);
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
  
  const fetchUserActivity = async () => {
    // In a real application, this would fetch from a user_activity or audit_log table
    // For this example, let's create some mock data
    const mockActivity: UserActivity[] = [
      { 
        id: '1', 
        username: 'admin', 
        action: t('admin.activityLogin'), 
        timestamp: new Date().toISOString() 
      },
      { 
        id: '2', 
        username: 'johndoe', 
        action: t('admin.activityDownload'), 
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
      },
      { 
        id: '3', 
        username: 'alice', 
        action: t('admin.activityPasswordChange'), 
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 minutes ago
      },
      { 
        id: '4', 
        username: 'robert', 
        action: t('admin.activityProfileUpdate'), 
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
      },
      { 
        id: '5', 
        username: 'emma', 
        action: t('admin.activityLogin'), 
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() // 45 minutes ago
      }
    ];
    
    setUserActivity(mockActivity);
  };
  
  const fetchUserGrowthData = async () => {
    // In a real application, this would run a SQL query to aggregate user registrations
    // For this example, we'll create mock data
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const currentMonth = new Date().getMonth();
    const labels = [];
    const data = [];
    
    // Generate labels for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      labels.push(months[monthIndex]);
      // Generate random data between 5 and 30 for demo purposes
      data.push(Math.floor(Math.random() * 25) + 5);
    }
    
    setUserGrowthData({
      labels,
      datasets: [{
        label: t('admin.newUsers'),
        data,
        backgroundColor: 'rgba(63, 118, 156, 0.2)',
        borderColor: 'rgba(63, 118, 156, 1)'
      }]
    });
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
        ? t('admin.adminRightsRemoved') 
        : t('admin.adminRightsGranted'));
      
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
    
    try {
      setError(null);
      setSuccess(null);
      
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          daily_quota: editingUser.daily_quota,
          monthly_request_quota: editingUser.monthly_request_quota 
        })
        .eq('id', editingUser.id);
      
      if (updateError) {
        throw updateError;
      }
      
      setSuccess(t('admin.quotaUpdated'));
      
      // Refresh user list and reset editing state
      fetchUsers();
      fetchUserStats();
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating quota:', err);
      setError((err as Error).message);
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
    link.setAttribute("download", `german-bookshelf-users-${new Date().toISOString().split('T')[0]}.csv`);
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
      link.setAttribute("download", `german-bookshelf-all-users-${new Date().toISOString().split('T')[0]}.csv`);
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
  
  const renderUserStats = () => {
    return (
      <StatsSection>
        <SectionHeader>
          <SectionTitle>{t('admin.userStatistics')}</SectionTitle>
          <SectionToggle onClick={() => setShowStats(!showStats)}>
            {showStats ? t('common.hide') : t('common.show')}
          </SectionToggle>
        </SectionHeader>
        
        {showStats && (
          <>
            <TabContainer>
              <Tab 
                active={statsTab === 'overview'} 
                onClick={() => setStatsTab('overview')}
              >
                {t('admin.overview')}
              </Tab>
              <Tab 
                active={statsTab === 'activity'} 
                onClick={() => setStatsTab('activity')}
              >
                {t('admin.recentActivity')}
              </Tab>
              <Tab 
                active={statsTab === 'growth'} 
                onClick={() => setStatsTab('growth')}
              >
                {t('admin.userGrowth')}
              </Tab>
            </TabContainer>
            
            {statsTab === 'overview' && (
              <StatsGrid>
                <StatCard>
                  <StatValue>{userStats.totalUsers}</StatValue>
                  <StatLabel>{t('admin.totalUsers')}</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{userStats.adminUsers}</StatValue>
                  <StatLabel>{t('admin.adminUsers')}</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{userStats.activeUsers}</StatValue>
                  <StatLabel>{t('admin.activeUsers')}</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{userStats.newUsersToday}</StatValue>
                  <StatLabel>{t('admin.newUsersToday')}</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{userStats.newUsersThisWeek}</StatValue>
                  <StatLabel>{t('admin.newUsersThisWeek')}</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{userStats.newUsersThisMonth}</StatValue>
                  <StatLabel>{t('admin.newUsersThisMonth')}</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{userStats.averageDailyQuota}</StatValue>
                  <StatLabel>{t('admin.averageQuota')}</StatLabel>
                </StatCard>
              </StatsGrid>
            )}
            
            {statsTab === 'activity' && (
              <UserActivityList>
                {userActivity.map(activity => (
                  <ActivityItem key={activity.id}>
                    <ActivityUser>
                      {activity.username} - {activity.action}
                    </ActivityUser>
                    <ActivityTime>
                      {new Date(activity.timestamp).toLocaleString()}
                    </ActivityTime>
                  </ActivityItem>
                ))}
              </UserActivityList>
            )}
            
            {statsTab === 'growth' && (
              <ChartContainer>
                <ChartTitle>{t('admin.userGrowthOverTime')}</ChartTitle>
                {/* 
                  Note: In a real implementation, you would render a Chart.js component here
                  For example: 
                  <Bar data={userGrowthData} options={{ maintainAspectRatio: false }} />
                */}
                <div style={{ textAlign: 'center', paddingTop: '80px', color: '#666' }}>
                  {t('admin.chartPlaceholder')} 
                  <div>
                    {t('admin.dataPoints')}: {userGrowthData.labels.join(', ')}
                  </div>
                  <div>
                    {t('admin.values')}: {userGrowthData.datasets[0].data.join(', ')}
                  </div>
                </div>
              </ChartContainer>
            )}
          </>
        )}
      </StatsSection>
    );
  };
  
  // Generate pagination buttons
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
    const totalPages = Math.ceil(totalCount / limit);
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

  if (authLoading || isLoading) {
    return (
      <AdminContainer>
        <LoadingState>{t('common.loading')}</LoadingState>
      </AdminContainer>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect to home
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          <FiUsers style={{ marginRight: '0.5rem' }} /> {t('admin.manageUsers')}
        </AdminTitle>
        
        <SearchBar>
          <SearchInput
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchTerm(e.target.value);
              setPage(0); // Reset to first page on search
            }}
          />
          <IconButton aria-label={t('common.search')}>
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
      {renderUserStats()}
      
      {/* Filters */}
      <FilterContainer>
        <FilterButton 
          active={roleFilter === 'all'} 
          onClick={() => setRoleFilter('all')}
        >
          <FiUsers /> {t('admin.allUsers')}
        </FilterButton>
        <FilterButton 
          active={roleFilter === 'admin'} 
          onClick={() => setRoleFilter('admin')}
        >
          <FiUsers /> {t('admin.adminUsers')}
        </FilterButton>
        <FilterButton 
          active={roleFilter === 'user'} 
          onClick={() => setRoleFilter('user')}
        >
          <FiUsers /> {t('admin.regularUsers')}
        </FilterButton>
        
        <DropdownFilter 
          value={activityFilter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
            setActivityFilter(e.target.value as ActivityFilter)
          }
        >
          <option value="all">{t('admin.activityAll')}</option>
          <option value="active">{t('admin.activityActive')}</option>
          <option value="inactive">{t('admin.activityInactive')}</option>
        </DropdownFilter>
        
        <DropdownFilter 
          value={quotaFilter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
            setQuotaFilter(e.target.value as QuotaFilter)
          }
        >
          <option value="all">{t('admin.quotaAll')}</option>
          <option value="high">{t('admin.quotaHigh')}</option>
          <option value="low">{t('admin.quotaLow')}</option>
        </DropdownFilter>
        
        <DateFilterContainer>
          <FiCalendar />
          <DateInput 
            type="date"
            value={dateRange.from}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setDateRange(prev => ({ ...prev, from: e.target.value }))
            }
            placeholder={t('admin.dateFrom')}
          />
          <span>-</span>
          <DateInput 
            type="date"
            value={dateRange.to}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setDateRange(prev => ({ ...prev, to: e.target.value }))
            }
            placeholder={t('admin.dateTo')}
          />
        </DateFilterContainer>
        
        <ExportButton onClick={handleExportUsers}>
          <FiDownload /> {t('admin.exportCurrentUsers')}
        </ExportButton>
        
        <ExportButton onClick={handleExportAllUsers}>
          <FiDownload /> {t('admin.exportAllUsers')}
        </ExportButton>
      </FilterContainer>
      
      {users.length > 0 ? (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('auth.username')}</TableHeader>
                  <TableHeader>{t('auth.email')}</TableHeader>
                  <TableHeader>{t('admin.role')}</TableHeader>
                  <TableHeader>{t('profile.quota')}</TableHeader>
                  <TableHeader>{t('profile.requestQuota', 'Monthly Requests')}</TableHeader>
                  <TableHeader>{t('common.actions')}</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {users.map((userProfile) => (
                  <TableRow key={userProfile.id}>
                    <TableCell>{userProfile.username}</TableCell>
                    <TableCell>{userProfile.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={userProfile.is_admin ? 'admin' : 'user'}>
                        {userProfile.is_admin ? t('admin.adminRole') : t('admin.userRole')}
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
                              title={t('common.save')}
                              onClick={handleSaveQuota}
                            >
                              <FiCheck />
                            </IconButton>
                            <IconButton 
                              className="cancel"
                              title={t('common.cancel')}
                              onClick={() => setEditingUser(null)}
                            >
                              <FiX />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton 
                            className="edit"
                            title={t('admin.editQuota')}
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
                                <FiX /> {t('admin.removeAdmin')}
                              </>
                            ) : (
                              <>
                                <FiCheck /> {t('admin.makeAdmin')}
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
                {t('common.showing')} {page * limit + 1} - {Math.min((page + 1) * limit, totalCount)} {t('common.of')} {totalCount} {t('common.results')}
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
            ? t('admin.noMatchingUsers') 
            : t('admin.noUsers')}
        </EmptyState>
      )}
    </AdminContainer>
  );
};

export default AdminUsersPage;
