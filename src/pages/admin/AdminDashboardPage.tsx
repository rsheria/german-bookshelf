import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiUsers, FiBook, FiDownload, FiMessageSquare, FiBarChart2, FiPieChart, FiTrendingUp, FiCalendar } from 'react-icons/fi';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import {
  AdminContainer,
  AdminHeader,
  AdminTitle,
  AdminSubtitle,
  StatsGrid,
  StatCard,
  StatTitle,
  StatValue,
  ButtonsContainer,
  ActionButton,
  SectionTitle,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  LoadingState
} from '../../styles/adminStyles';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Styled components for analytics
const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background-color: ${(props) => props.theme.colors.card};
  border-radius: ${(props) => props.theme.borderRadius.lg};
  box-shadow: ${(props) => props.theme.shadows.md};
  padding: 1.5rem;
  border: 1px solid ${(props) => props.theme.colors.border};
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: ${(props) => props.theme.shadows.lg};
    transform: translateY(-5px);
  }
  
  h3 {
    font-size: ${(props) => props.theme.typography.fontSize.xl};
    color: ${(props) => props.theme.colors.primary};
    margin-top: 0;
    margin-bottom: 1rem;
    font-family: ${(props) => props.theme.typography.fontFamily.heading};
    font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
  }
`;

const TimeRangeSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

interface TimeButtonProps {
  $active?: boolean;
}

const TimeButton = styled.button<TimeButtonProps>`
  padding: 0.5rem 1rem;
  border: 1px solid ${(props) => props.$active 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: ${(props) => props.theme.borderRadius.md};
  background-color: ${(props) => props.$active 
    ? props.theme.colors.primary 
    : 'transparent'};
  color: ${(props) => props.$active 
    ? 'white' 
    : props.theme.colors.text};
  cursor: pointer;
  transition: all 0.2s;
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  
  &:hover {
    background-color: ${(props) => props.$active 
      ? props.theme.colors.primaryDark 
      : props.theme.colors.backgroundAlt};
    transform: translateY(-2px);
  }
`;

// Define chart dataset types
interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
}

interface PieChartDataset {
  data: number[];
  backgroundColor: string[];
  borderColor: string[];
  borderWidth: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface PieChartData {
  labels: string[];
  datasets: PieChartDataset[];
}

const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalAudiobooks: 0,
    totalEbooks: 0,
    totalUsers: 0,
    totalDownloads: 0,
    totalBookRequests: 0
  });
  const [recentDownloads, setRecentDownloads] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [downloadTrend, setDownloadTrend] = useState<ChartData>({
    labels: [],
    datasets: []
  });
  const [bookTypeDistribution, setBookTypeDistribution] = useState<PieChartData>({
    labels: [],
    datasets: []
  });

  useEffect(() => {
    // Redirect if not admin
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    
    fetchAdminData();
  }, [user, isAdmin, timeRange]);

  const fetchAdminData = async () => {
    if (!user || !isAdmin) return;
    
    setIsLoading(true);
    
    try {
      // Fetch total books count
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
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
        .from('downloads')
        .select('*', { count: 'exact', head: true });
        
      // Fetch book requests count
      const { count: totalBookRequests } = await supabase
        .from('book_requests')
        .select('*', { count: 'exact', head: true });
      
      // Fetch recent downloads
      const { data: recentDownloadsData } = await supabase
        .from('downloads')
        .select(`
          id,
          downloaded_at,
          books (
            id,
            title,
            type
          ),
          profiles (
            id,
            username
          )
        `)
        .order('downloaded_at', { ascending: false })
        .limit(10);
        
      // Fetch download trend data
      await fetchDownloadTrendData();
      
      // Fetch book type distribution
      await fetchBookTypeDistribution();
      
      setStats({
        totalBooks: totalBooks || 0,
        totalAudiobooks: totalAudiobooks || 0,
        totalEbooks: totalEbooks || 0,
        totalUsers: totalUsers || 0,
        totalDownloads: totalDownloads || 0,
        totalBookRequests: totalBookRequests || 0
      });
      
      setRecentDownloads(recentDownloadsData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchDownloadTrendData = async () => {
    // Calculate the start date based on the selected time range
    let startDate = new Date();
    
    if (timeRange === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (timeRange === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    try {
      // This is a simplified approach - in a real app, you'd use database functions for date grouping
      // For this demo, we'll simulate the data
      
      const labels = [];
      const audioData = [];
      const ebookData = [];
      
      // Generate dummy data based on time range
      if (timeRange === 'week') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
          audioData.push(Math.floor(Math.random() * 10));
          ebookData.push(Math.floor(Math.random() * 15));
        }
      } else if (timeRange === 'month') {
        // Last 4 weeks
        for (let i = 0; i < 4; i++) {
          labels.push(`Week ${i+1}`);
          audioData.push(Math.floor(Math.random() * 30));
          ebookData.push(Math.floor(Math.random() * 45));
        }
      } else if (timeRange === 'year') {
        // Last 12 months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        
        for (let i = 11; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12;
          labels.push(months[monthIndex]);
          audioData.push(Math.floor(Math.random() * 50));
          ebookData.push(Math.floor(Math.random() * 75));
        }
      }
      
      setDownloadTrend({
        labels,
        datasets: [
          {
            label: t('books.audiobook'),
            data: audioData,
            borderColor: '#3F769C',
            backgroundColor: 'rgba(63, 118, 156, 0.2)',
            tension: 0.3,
          },
          {
            label: t('books.ebook'),
            data: ebookData,
            borderColor: '#D8B589',
            backgroundColor: 'rgba(216, 181, 137, 0.2)',
            tension: 0.3,
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching download trend data:', error);
    }
  };
  
  const fetchBookTypeDistribution = async () => {
    try {
      // In a real app, this would come from the database
      // For this demo, we'll use the stats we already have
      
      setBookTypeDistribution({
        labels: [t('books.audiobook'), t('books.ebook')],
        datasets: [
          {
            data: [stats.totalAudiobooks, stats.totalEbooks],
            backgroundColor: ['#3F769C', '#D8B589'],
            borderColor: ['#2D5470', '#BF9B6F'],
            borderWidth: 1,
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching book type distribution:', error);
    }
  };

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

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>{t('admin.dashboard')}</AdminTitle>
        <AdminSubtitle>{t('admin.dashboardSubtitle')}</AdminSubtitle>
      </AdminHeader>
      
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
        
        <StatCard>
          <StatTitle><FiMessageSquare /> {t('admin.bookRequests')}</StatTitle>
          <StatValue>{stats.totalBookRequests}</StatValue>
        </StatCard>
      </StatsGrid>
      
      <ButtonsContainer>
        <ActionButton onClick={() => navigate('/admin/books')}>
          <FiBook /> {t('admin.manageBooks')}
        </ActionButton>
        
        <ActionButton onClick={() => navigate('/admin/users')}>
          <FiUsers /> {t('admin.manageUsers')}
        </ActionButton>
        
        <ActionButton onClick={() => navigate('/admin/books/add')} className="secondary">
          <FiBook /> {t('admin.addBook')}
        </ActionButton>

        <ActionButton onClick={() => navigate('/admin/book-requests')}>
          <FiMessageSquare /> {t('admin.manageBookRequests', 'Manage Book Requests')}
        </ActionButton>
      </ButtonsContainer>
      
      <SectionTitle>
        <FiBarChart2 style={{ marginRight: '0.5rem' }} />
        {t('admin.analytics')}
      </SectionTitle>
      
      <TimeRangeSelector>
        <FiCalendar style={{ color: '#8C8C96' }} />
        <TimeButton 
          $active={timeRange === 'week'} 
          onClick={() => setTimeRange('week')}
        >
          {t('admin.weekView')}
        </TimeButton>
        <TimeButton 
          $active={timeRange === 'month'} 
          onClick={() => setTimeRange('month')}
        >
          {t('admin.monthView')}
        </TimeButton>
        <TimeButton 
          $active={timeRange === 'year'} 
          onClick={() => setTimeRange('year')}
        >
          {t('admin.yearView')}
        </TimeButton>
      </TimeRangeSelector>
      
      <AnalyticsGrid>
        <ChartCard>
          <h3>
            <FiTrendingUp style={{ marginRight: '0.5rem' }} />
            {t('admin.downloadTrends')}
          </h3>
          <Line 
            data={downloadTrend} 
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    precision: 0
                  }
                }
              }
            }} 
          />
        </ChartCard>
        
        <ChartCard>
          <h3>
            <FiPieChart style={{ marginRight: '0.5rem' }} />
            {t('admin.bookTypeDistribution')}
          </h3>
          <div style={{ maxHeight: '300px', display: 'flex', justifyContent: 'center' }}>
            <Pie 
              data={bookTypeDistribution}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  }
                }
              }}
            />
          </div>
        </ChartCard>
      </AnalyticsGrid>
      
      <SectionTitle>{t('admin.recentDownloads')}</SectionTitle>
      
      <TableContainer>
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
      </TableContainer>
    </AdminContainer>
  );
};

export default AdminDashboardPage;
