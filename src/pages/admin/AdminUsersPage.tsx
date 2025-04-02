import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUsers, FiEdit, FiCheck, FiX, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Profile } from '../../types/supabase';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 0 1rem;
  width: 300px;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  padding: 0.75rem 0;
  outline: none;
  font-size: 1rem;
  width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const TableHead = styled.thead`
  background-color: #f8f9fa;
`;

const TableRow = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 1rem;
  font-weight: 600;
  color: #2c3e50;
`;

const TableCell = styled.td`
  padding: 1rem;
  color: #333;
`;

const Badge = styled.span<{ type: 'admin' | 'user' }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  background-color: ${({ type }) => (type === 'admin' ? '#3498db' : '#95a5a6')};
  color: white;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
`;

const EditButton = styled(Button)`
  background-color: #3498db;
  color: white;
  border: none;
  width: 36px;
  height: 36px;

  &:hover {
    background-color: #2980b9;
  }
`;

const ToggleAdminButton = styled(Button)<{ isAdmin: boolean }>`
  background-color: ${({ isAdmin }) => (isAdmin ? '#e74c3c' : '#2ecc71')};
  color: white;
  border: none;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background-color: ${({ isAdmin }) => (isAdmin ? '#c0392b' : '#27ae60')};
  }
`;

const QuotaInput = styled.input`
  width: 60px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
`;

const SaveButton = styled(Button)`
  background-color: #2ecc71;
  color: white;
  border: none;
  width: 36px;
  height: 36px;

  &:hover {
    background-color: #27ae60;
  }
`;

const CancelButton = styled(Button)`
  background-color: #e74c3c;
  color: white;
  border: none;
  width: 36px;
  height: 36px;

  &:hover {
    background-color: #c0392b;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
`;

const PageButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: ${({ active }) => (active ? '#3498db' : 'white')};
  color: ${({ active }) => (active ? 'white' : '#333')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ active }) => (active ? '#2980b9' : '#f5f5f5')};
  }

  &:disabled {
    background-color: #f5f5f5;
    color: #999;
    cursor: not-allowed;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
  background-color: #f8f9fa;
  border-radius: 8px;
`;

const StatusMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
`;

const Success = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #d4edda;
  color: #155724;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
`;

interface UserWithEmail extends Profile {
  email?: string;
}

interface EditingUser {
  id: string;
  daily_quota: number;
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
      
      // Apply search filter
      if (searchTerm) {
        query = query.ilike('username', `%${searchTerm}%`);
      }
      
      // Apply pagination
      const from = page * limit;
      const to = from + limit - 1;
      
      const { data: profilesData, error: fetchError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Get emails for each user
      const usersWithEmail: UserWithEmail[] = [];
      
      if (profilesData) {
        for (const profile of profilesData) {
          // Get user email from auth.users
          if (!supabase) {
            throw new Error('Supabase client is not initialized');
          }
          
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
            profile.id
          );
          
          if (!userError && userData) {
            usersWithEmail.push({
              ...profile,
              email: userData.user.email
            });
          } else {
            usersWithEmail.push(profile);
          }
        }
      }
      
      setUsers(usersWithEmail);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user, isAdmin, searchTerm, page]);

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
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
      
      // Update local state
      setUsers(prev => 
        prev.map(u => 
          u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u
        )
      );
      
      setSuccess(
        currentIsAdmin 
          ? t('admin.adminRightsRemoved') 
          : t('admin.adminRightsGranted')
      );
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error toggling admin status:', err);
      setError((err as Error).message);
    }
  };

  const handleEditQuota = (userId: string, currentQuota: number) => {
    setEditingUser({
      id: userId,
      daily_quota: currentQuota
    });
  };

  const handleSaveQuota = async () => {
    if (!editingUser) return;
    
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ daily_quota: editingUser.daily_quota })
        .eq('id', editingUser.id);
      
      if (updateError) {
        throw updateError;
      }
      
      // Update local state
      setUsers(prev => 
        prev.map(u => 
          u.id === editingUser.id ? { ...u, daily_quota: editingUser.daily_quota } : u
        )
      );
      
      setSuccess(t('admin.quotaUpdated'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
      // Exit edit mode
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating quota:', err);
      setError((err as Error).message);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);
  
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
        {t('common.previous')}
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
        {t('common.next')}
      </PageButton>
    );
    
    return buttons;
  };

  if (authLoading || isLoading) {
    return (
      <Container>
        <LoadingState>{t('common.loading')}</LoadingState>
      </Container>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect to home
  }

  return (
    <Container>
      <Header>
        <Title>
          <FiUsers /> {t('admin.manageUsers')}
        </Title>
        
        <SearchBar>
          <FiSearch style={{ color: '#666', marginRight: '0.5rem' }} />
          <SearchInput
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0); // Reset to first page on search
            }}
          />
        </SearchBar>
      </Header>
      
      {error && (
        <StatusMessage>
          <FiX /> {error}
        </StatusMessage>
      )}
      
      {success && (
        <Success>
          <FiCheck />
          {success}
        </Success>
      )}
      
      {users.length > 0 ? (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{t('auth.username')}</TableHeader>
                <TableHeader>{t('auth.email')}</TableHeader>
                <TableHeader>{t('admin.role')}</TableHeader>
                <TableHeader>{t('profile.quota')}</TableHeader>
                <TableHeader>{t('common.actions')}</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {users.map((userProfile) => (
                <TableRow key={userProfile.id}>
                  <TableCell>{userProfile.username}</TableCell>
                  <TableCell>{userProfile.email || '-'}</TableCell>
                  <TableCell>
                    <Badge type={userProfile.is_admin ? 'admin' : 'user'}>
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
                        onChange={(e) => 
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
                    <ActionButtons>
                      {editingUser && editingUser.id === userProfile.id ? (
                        <>
                          <SaveButton 
                            title={t('common.save')}
                            onClick={handleSaveQuota}
                          >
                            <FiCheck />
                          </SaveButton>
                          <CancelButton 
                            title={t('common.cancel')}
                            onClick={() => setEditingUser(null)}
                          >
                            <FiX />
                          </CancelButton>
                        </>
                      ) : (
                        <EditButton 
                          title={t('admin.editQuota')}
                          onClick={() => handleEditQuota(userProfile.id, userProfile.daily_quota)}
                        >
                          <FiEdit />
                        </EditButton>
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
          
          {totalPages > 1 && (
            <Pagination>
              {renderPagination()}
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
    </Container>
  );
};

export default AdminUsersPage;
