import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUsers, FiEdit, FiCheck, FiX, FiSearch } from 'react-icons/fi';
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

const ToggleAdminButton = styled.button<{ isAdmin: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  border: none;
  background-color: ${props => props.isAdmin 
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

interface UserWithEmail extends Profile {
  email?: string;
}

interface EditingUser {
  id: string;
  daily_quota: number;
  monthly_request_quota: number;
}

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
    }
  }, [user, isAdmin, searchTerm, page]);

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
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating quota:', err);
      setError((err as Error).message);
    }
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
                          <ToggleAdminButton 
                            isAdmin={userProfile.is_admin}
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
                          </ToggleAdminButton>
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
