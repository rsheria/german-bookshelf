import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiBook, FiUsers, FiDownload } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseClient } from '../../utils/supabaseHelpers';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin: 0 0 1rem 0;
`;

const Subtitle = styled.p`
  color: #7f8c8d;
  margin: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
`;

const StatTitle = styled.div`
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2980b9;
  }
`;

const RecentSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: #2c3e50;
  margin: 0 0 1rem 0;
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

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
`;

const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalAudiobooks: 0,
    totalEbooks: 0,
    totalUsers: 0,
    totalDownloads: 0
  });
  const [recentDownloads, setRecentDownloads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Redirect if not admin
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!user || !isAdmin) return;
      
      setIsLoading(true);
      
      try {
        // Fetch total books count
        const supabase = getSupabaseClient();
        const { count: totalBooks } = await supabase
          .from('books')
          .select('*', { count: 'exact', head: true });
        
        // Fetch audiobooks count
        const { count: totalAudiobooks } = await supabase
          .from('books')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'audiobook');
        
        // Fetch ebooks count
        const { count: totalEbooks } = await supabase
          .from('books')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'ebook');
        
        // Fetch users count
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        // Fetch downloads count
        const { count: totalDownloads } = await supabase
          .from('download_logs')
          .select('*', { count: 'exact', head: true });
        
        // Fetch recent downloads with user and book info
        const { data: recentDownloadsData } = await supabase
          .from('download_logs')
          .select(`
            id,
            downloaded_at,
            books (id, title, type),
            profiles (username)
          `)
          .order('downloaded_at', { ascending: false })
          .limit(10);
        
        setStats({
          totalBooks: totalBooks || 0,
          totalAudiobooks: totalAudiobooks || 0,
          totalEbooks: totalEbooks || 0,
          totalUsers: totalUsers || 0,
          totalDownloads: totalDownloads || 0
        });
        
        setRecentDownloads(recentDownloadsData || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAdminData();
  }, [user, isAdmin]);

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

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Container>
      <Header>
        <Title>{t('admin.dashboard')}</Title>
        <Subtitle>{t('admin.dashboardSubtitle')}</Subtitle>
      </Header>
      
      <StatsGrid>
        <StatCard>
          <StatTitle><FiBook /> {t('admin.totalBooks')}</StatTitle>
          <StatValue>{stats.totalBooks}</StatValue>
        </StatCard>
        
        <StatCard>
          <StatTitle><FiBook /> {t('books.audiobook')}</StatTitle>
          <StatValue>{stats.totalAudiobooks}</StatValue>
        </StatCard>
        
        <StatCard>
          <StatTitle><FiBook /> {t('books.ebook')}</StatTitle>
          <StatValue>{stats.totalEbooks}</StatValue>
        </StatCard>
        
        <StatCard>
          <StatTitle><FiUsers /> {t('admin.totalUsers')}</StatTitle>
          <StatValue>{stats.totalUsers}</StatValue>
        </StatCard>
        
        <StatCard>
          <StatTitle><FiDownload /> {t('admin.totalDownloads')}</StatTitle>
          <StatValue>{stats.totalDownloads}</StatValue>
        </StatCard>
      </StatsGrid>
      
      <ButtonsContainer>
        <ActionButton onClick={() => navigate('/admin/books')}>
          <FiBook /> {t('admin.manageBooks')}
        </ActionButton>
        
        <ActionButton onClick={() => navigate('/admin/users')}>
          <FiUsers /> {t('admin.manageUsers')}
        </ActionButton>
        
        <ActionButton onClick={() => navigate('/admin/books/add')}>
          <FiBook /> {t('admin.addBook')}
        </ActionButton>
      </ButtonsContainer>
      
      <RecentSection>
        <SectionTitle>{t('admin.recentDownloads')}</SectionTitle>
        
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>{t('books.title')}</TableHeader>
              <TableHeader>{t('books.type')}</TableHeader>
              <TableHeader>{t('auth.username')}</TableHeader>
              <TableHeader>{t('admin.downloadDate')}</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {recentDownloads.map((download) => (
              <TableRow key={download.id}>
                <TableCell>{download.books?.title}</TableCell>
                <TableCell>
                  {download.books?.type === 'audiobook' 
                    ? t('books.audiobook') 
                    : t('books.ebook')}
                </TableCell>
                <TableCell>{download.profiles?.username}</TableCell>
                <TableCell>{formatDate(download.downloaded_at)}</TableCell>
              </TableRow>
            ))}
            
            {recentDownloads.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} style={{ textAlign: 'center' }}>
                  {t('admin.noRecentDownloads')}
                </TableCell>
              </TableRow>
            )}
          </tbody>
        </Table>
      </RecentSection>
    </Container>
  );
};

export default AdminDashboardPage;
