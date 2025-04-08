import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { 
  FiUsers, FiEdit, FiCheck, FiX, FiSearch, FiDownload, 
  FiPackage, FiGlobe, FiUserX, FiUnlock, FiActivity 
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Profile, UserStatus, Plan } from '../../types/supabase';
import UserBanDialog from '../../components/admin/UserBanDialog';
import UserPlanDialog from '../../components/admin/UserPlanDialog';
import UserIpTrackingDialog from '../../components/admin/UserIpTrackingDialog';
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

// Custom Button component since it's not exported from adminStyles
// const Button = styled.button`
//   background-color: ${props => props.theme.colors.primary};
//   color: white;
//   padding: 0.5rem 1rem;
//   border: none;
//   border-radius: ${props => props.theme.borderRadius.md};
//   cursor: pointer;
//   font-size: ${props => props.theme.typography.fontSize.md};
//   display: flex;
//   align-items: center;
//   gap: 0.5rem;
//   transition: all 0.2s;
  
//   &:hover {
//     background-color: ${props => props.theme.colors.primaryHover || props.theme.colors.primary};
//     transform: translateY(-2px);
//   }
  
//   &:disabled {
//     opacity: 0.6;
//     cursor: not-allowed;
//   }
// `;

const StatsSection = styled.div`
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const StatCard = styled.div`
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
`;

const StatIcon = styled.div`
  background-color: ${props => props.theme.colors.primary || '#007bff'};
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
`;

const StatLabel = styled.div`
  color: #6c757d;
  font-size: 0.875rem;
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

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
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
type UserStatusFilter = 'all' | 'active' | 'banned' | 'suspended';

const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [roleFilter, setRoleFilter] = useState<UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');
  const [showStatsSection, setShowStatsSection] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    adminUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    averageDailyQuota: 0
  });
  
  // State for modals
  const [selectedUser, setSelectedUser] = useState<UserWithEmail | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showIpTrackingDialog, setShowIpTrackingDialog] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  const totalPages = Math.ceil(totalCount / limit);

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
      fetchUserStats();
      fetchPlans();
    }
  }, [user, isAdmin, page, limit, roleFilter, statusFilter, dateRange]);
  
  // Function to fetch plans
  const fetchPlans = async () => {
    if (!user || !isAdmin) return;
    
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });
        
      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

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
      
      // Status filter (new)
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Date range filters
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

  const handleEditQuota = (userId: string, currentQuota: number, monthlyRequestQuota: number) => {
    setEditingUser({ id: userId, daily_quota: currentQuota, monthly_request_quota: monthlyRequestQuota });
  };

  // New handlers for user actions
  const handleBanUser = (user: UserWithEmail) => {
    setSelectedUser(user);
    setShowBanDialog(true);
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);
      
      const { error: unbanError } = await supabase.rpc('unban_user', {
        user_id: userId
      });
      
      if (unbanError) throw unbanError;
      
      setSuccess(t('userUnbanned'));
      fetchUsers();
    } catch (err: any) {
      console.error('Error unbanning user:', err.message);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManagePlan = (user: UserWithEmail) => {
    setSelectedUser(user);
    setShowPlanDialog(true);
  };

  const handleViewIps = (user: UserWithEmail) => {
    setSelectedUser(user);
    setShowIpTrackingDialog(true);
  };

  const getUserStatusBadge = (status?: UserStatus) => {
    if (!status || status === 'active') {
      return <StatusBadge status="active">{t('active')}</StatusBadge>;
    } else if (status === 'banned') {
      return <StatusBadge status="banned">{t('banned')}</StatusBadge>;
    } else if (status === 'suspended') {
      return <StatusBadge status="suspended">{t('suspended')}</StatusBadge>;
    }
    
    return null;
  };
  
  const getPlanName = (planId?: string) => {
    if (!planId) return t('noPlan');
    
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : t('unknownPlan');
  };

  const handleExportUsers = () => {
    // Convert users data to CSV format
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add headers
    csvContent += "ID,Username,Email,Role,Status,Plan,Daily Quota,Monthly Quota,Created At\n";
    
    // Add data rows
    users.forEach(userProfile => {
      const row = [
        userProfile.id,
        userProfile.username,
        userProfile.email || '-',
        userProfile.is_admin ? 'Admin' : 'User',
        userProfile.status || 'active',
        getPlanName(userProfile.plan_id),
        userProfile.daily_quota,
        userProfile.monthly_request_quota,
        userProfile.created_at
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
      
      // Status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Date range filters
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from);
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to);
      }
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Convert all users data to CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      csvContent += "ID,Username,Email,Role,Status,Plan,Daily Quota,Monthly Quota,Created At\n";
      
      // Add data rows
      data?.forEach(userProfile => {
        const row = [
          userProfile.id,
          userProfile.username,
          userProfile.email || '-',
          userProfile.is_admin ? 'Admin' : 'User',
          userProfile.status || 'active',
          getPlanName(userProfile.plan_id),
          userProfile.daily_quota,
          userProfile.monthly_request_quota,
          userProfile.created_at
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
    } catch (err) {
      console.error('Error updating admin status:', err);
      setError((err as Error).message);
    }
  };

  const handleSaveQuota = async () => {
    if (!editingUser) return;
    
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          daily_quota: editingUser.daily_quota,
          monthly_request_quota: editingUser.monthly_request_quota
        })
        .eq('id', editingUser.id);
      
      if (error) throw error;
      
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
      
      // Clear the editing state
      setEditingUser(null);
    } catch (err) {
      console.error('Exception updating user quota:', err);
      setError((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

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
      
      // Get active users
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
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
          totalQuota += item.daily_quota || 0;
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

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          <FiUsers /> {t('userManagement')}
        </AdminTitle>
        
        <SearchBar>
          <SearchInput 
            type="text"
            placeholder={t('searchUsers')}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                fetchUsers();
              }
            }}
          />
          <IconButton 
            title={t('search')}
            onClick={fetchUsers}
          >
            <FiSearch />
          </IconButton>
          <ExportButton onClick={() => handleExportUsers()}>
            <FiDownload /> {t('export')}
          </ExportButton>
          <ExportButton onClick={() => handleExportAllUsers()}>
            <FiDownload /> {t('exportAll')}
          </ExportButton>
        </SearchBar>
      </AdminHeader>
      
      <SectionHeader>
        <SectionToggle onClick={() => setShowStatsSection(!showStatsSection)}>
          {showStatsSection ? t('hideStats') : t('showStats')}
        </SectionToggle>
        
        <FilterContainer>
          <FilterButton 
            active={roleFilter === 'all'} 
            onClick={() => setRoleFilter('all')}
          >
            {t('allUsers')}
          </FilterButton>
          <FilterButton 
            active={roleFilter === 'admin'} 
            onClick={() => setRoleFilter('admin')}
          >
            {t('adminUsers')}
          </FilterButton>
          <FilterButton 
            active={roleFilter === 'user'} 
            onClick={() => setRoleFilter('user')}
          >
            {t('normalUsers')}
          </FilterButton>
        </FilterContainer>
        
        {/* New status filter */}
        <FilterContainer>
          <FilterButton 
            active={statusFilter === 'all'} 
            onClick={() => setStatusFilter('all')}
          >
            {t('allStatuses')}
          </FilterButton>
          <FilterButton 
            active={statusFilter === 'active'} 
            onClick={() => setStatusFilter('active')}
          >
            {t('activeUsers')}
          </FilterButton>
          <FilterButton 
            active={statusFilter === 'banned'} 
            onClick={() => setStatusFilter('banned')}
          >
            {t('bannedUsers')}
          </FilterButton>
          <FilterButton 
            active={statusFilter === 'suspended'} 
            onClick={() => setStatusFilter('suspended')}
          >
            {t('suspendedUsers')}
          </FilterButton>
        </FilterContainer>
        
        <DateFilterContainer>
          <DateInput 
            type="date"
            value={dateRange.from}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setDateRange(prev => ({ ...prev, from: e.target.value }))
            }
          />
          <span>-</span>
          <DateInput 
            type="date"
            value={dateRange.to}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setDateRange(prev => ({ ...prev, to: e.target.value }))
            }
          />
        </DateFilterContainer>
      </SectionHeader>
      
      {showStatsSection && (
        <StatsSection>
          <SectionTitle>{t('userStatistics')}</SectionTitle>
          
          <StatsGrid>
            <StatCard>
              <StatIcon>
                <FiActivity />
              </StatIcon>
              <StatContent>
                <StatValue>{userStats.totalUsers}</StatValue>
                <StatLabel>{t('totalUsers')}</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon>
                <FiActivity />
              </StatIcon>
              <StatContent>
                <StatValue>{userStats.adminUsers}</StatValue>
                <StatLabel>{t('adminUsers')}</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon>
                <FiActivity />
              </StatIcon>
              <StatContent>
                <StatValue>{userStats.activeUsers}</StatValue>
                <StatLabel>{t('activeUsers')}</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon>
                <FiActivity />
              </StatIcon>
              <StatContent>
                <StatValue>{userStats.newUsersToday}</StatValue>
                <StatLabel>{t('newUsersToday')}</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon>
                <FiActivity />
              </StatIcon>
              <StatContent>
                <StatValue>{userStats.newUsersThisWeek}</StatValue>
                <StatLabel>{t('newUsersThisWeek')}</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon>
                <FiActivity />
              </StatIcon>
              <StatContent>
                <StatValue>{userStats.newUsersThisMonth}</StatValue>
                <StatLabel>{t('newUsersThisMonth')}</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon>
                <FiActivity />
              </StatIcon>
              <StatContent>
                <StatValue>{userStats.averageDailyQuota}</StatValue>
                <StatLabel>{t('averageDailyQuota')}</StatLabel>
              </StatContent>
            </StatCard>
          </StatsGrid>
        </StatsSection>
      )}
      
      {error && <StatusMessage>{error}</StatusMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      
      {isLoading ? (
        <LoadingState>{t('loadingUsers')}</LoadingState>
      ) : users.length > 0 ? (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('username')}</TableHeader>
                  <TableHeader>{t('email')}</TableHeader>
                  <TableHeader>{t('role')}</TableHeader>
                  <TableHeader>{t('status')}</TableHeader>
                  <TableHeader>{t('plan')}</TableHeader>
                  <TableHeader>{t('created')}</TableHeader>
                  <TableHeader>{t('quota')}</TableHeader>
                  <TableHeader>{t('monthlyQuota')}</TableHeader>
                  <TableHeader>{t('actions')}</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {users.map((userProfile) => (
                  <TableRow key={userProfile.id}>
                    <TableCell>{userProfile.username}</TableCell>
                    <TableCell>{userProfile.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={userProfile.is_admin ? 'admin' : 'user'}>
                        {userProfile.is_admin ? t('admin') : t('user')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getUserStatusBadge(userProfile.status as UserStatus)}
                    </TableCell>
                    <TableCell>
                      {getPlanName(userProfile.plan_id)}
                    </TableCell>
                    <TableCell>
                      {new Date(userProfile.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {editingUser && editingUser.id === userProfile.id ? (
                        <QuotaInput
                          type="number"
                          min="0"
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
                          <>
                            <IconButton 
                              className="edit"
                              title={t('editQuota')}
                              onClick={() => handleEditQuota(
                                userProfile.id, 
                                userProfile.daily_quota, 
                                userProfile.monthly_request_quota
                              )}
                            >
                              <FiEdit />
                            </IconButton>
                            
                            <IconButton 
                              title={t('managePlan')}
                              onClick={() => handleManagePlan(userProfile)}
                            >
                              <FiPackage />
                            </IconButton>
                            
                            <IconButton 
                              title={t('viewIpAddresses')}
                              onClick={() => handleViewIps(userProfile)}
                            >
                              <FiGlobe />
                            </IconButton>
                            
                            {/* Status dependent action buttons */}
                            {(!userProfile.status || userProfile.status === 'active') ? (
                              <IconButton 
                                className="danger"
                                title={t('banUser')}
                                onClick={() => handleBanUser(userProfile)}
                              >
                                <FiUserX />
                              </IconButton>
                            ) : (
                              <IconButton 
                                className="success"
                                title={t('unbanUser')}
                                onClick={() => handleUnbanUser(userProfile.id)}
                              >
                                <FiUnlock />
                              </IconButton>
                            )}
                          </>
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
      
      {/* Dialog components */}
      {selectedUser && showBanDialog && (
        <UserBanDialog 
          user={selectedUser} 
          isOpen={showBanDialog}
          onClose={() => {
            setShowBanDialog(false);
            setSelectedUser(null);
          }}
          onBanUser={async (userId, reason, duration) => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({
                  status: 'banned',
                  ban_reason: reason,
                  banned_until: duration ? new Date(new Date().getTime() + duration * 86400000).toISOString() : null
                })
                .eq('id', userId);
                
              if (error) throw error;
              
              setSuccess(t('userBannedSuccess'));
              setTimeout(() => setSuccess(null), 3000);
              fetchUsers();
            } catch (error) {
              console.error('Error banning user:', error);
              setError(t('errorBanningUser'));
              setTimeout(() => setError(null), 3000);
            }
            
            setShowBanDialog(false);
            setSelectedUser(null);
          }}
        />
      )}
      
      {selectedUser && showPlanDialog && (
        <UserPlanDialog
          user={selectedUser}
          plans={plans}
          isOpen={showPlanDialog}
          onClose={() => {
            setShowPlanDialog(false);
            setSelectedUser(null);
          }}
          onUpdatePlan={async (userId, planId, dailyQuota, monthlyRequestQuota) => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({
                  plan_id: planId,
                  daily_quota: dailyQuota,
                  monthly_request_quota: monthlyRequestQuota
                })
                .eq('id', userId);
                
              if (error) throw error;
              
              setSuccess(t('userPlanUpdatedSuccess'));
              setTimeout(() => setSuccess(null), 3000);
              fetchUsers();
            } catch (error) {
              console.error('Error updating user plan:', error);
              setError(t('errorUpdatingPlan'));
              setTimeout(() => setError(null), 3000);
            }
            
            setShowPlanDialog(false);
            setSelectedUser(null);
          }}
        />
      )}
      
      {selectedUser && showIpTrackingDialog && (
        <UserIpTrackingDialog
          user={selectedUser}
          isOpen={showIpTrackingDialog}
          onClose={() => {
            setShowIpTrackingDialog(false);
            setSelectedUser(null);
          }}
        />
      )}
    </AdminContainer>
  );
};

const StatusBadge = styled.span<{ status: UserStatus }>`
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  
  ${props => {
    switch (props.status) {
      case 'active':
        return `
          background-color: ${props.theme.colors.success}20;
          color: ${props.theme.colors.success};
        `;
      case 'banned':
        return `
          background-color: ${props.theme.colors.danger}20;
          color: ${props.theme.colors.danger};
        `;
      case 'suspended':
        return `
          background-color: ${props.theme.colors.warning}20;
          color: ${props.theme.colors.warning};
        `;
      default:
        return '';
    }
  }}
`;

export default AdminUsersPage;
