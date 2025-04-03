import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUser, FiDownload, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useDownloads } from '../hooks/useDownloads';
import { Book } from '../types/supabase';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const CardTitle = styled.h2`
  font-size: 1.2rem;
  color: #2c3e50;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProfileInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const InfoLabel = styled.span`
  font-size: 0.9rem;
  color: #666;
`;

const InfoValue = styled.span`
  font-size: 1.1rem;
  font-weight: 500;
`;

const QuotaBar = styled.div`
  height: 8px;
  background-color: #ecf0f1;
  border-radius: 4px;
  margin-top: 0.5rem;
  overflow: hidden;
`;

const QuotaProgress = styled.div<{ percent: number }>`
  height: 100%;
  width: ${({ percent }) => `${percent}%`};
  background-color: ${({ percent }) => 
    percent < 50 ? '#2ecc71' : percent < 80 ? '#f39c12' : '#e74c3c'};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const DownloadList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const DownloadItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
`;

const BookCover = styled.img`
  width: 50px;
  height: 75px;
  object-fit: cover;
  border-radius: 4px;
`;

const DownloadInfo = styled.div`
  flex-grow: 1;
`;

const BookTitle = styled.div`
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const DownloadDate = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  background-color: #f8f9fa;
  border-radius: 4px;
`;

const Alert = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
`;

const RefreshButton = styled.button`
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 4px;
  
  &:hover {
    background-color: #f0f8ff;
  }
`;

// Fallback values for when data isn't loaded properly
const DEFAULT_QUOTA = 3;
const FALLBACK_USER = { email: 'user@example.com' };
const FALLBACK_PROFILE = { username: 'User', daily_quota: DEFAULT_QUOTA };

interface DownloadHistoryItem {
  id: string;
  book: Book;
  downloaded_at: string;
}

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { remainingQuota, checkRemainingQuota } = useDownloads();
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Handler to manually refresh data
  const handleRefresh = () => {
    setRetryCount(prev => prev + 1);
    setIsLoading(true);
    setError(null);
  };

  useEffect(() => {
    // Redirect if not logged in and not loading
    if (!authLoading && !user) {
      console.log("No user found, redirecting to login");
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchDownloadHistory = async () => {
      // Skip if no user, but don't set error
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.log("Download history fetch timed out");
          setIsLoading(false);
          setDownloadHistory([]);
          setError("Download history took too long to load. Please try refreshing.");
        }
      }, 5000); // 5 second timeout
      
      try {
        // Check remaining quota with error handling
        try {
          await checkRemainingQuota();
        } catch (err) {
          console.warn("Could not check quota, continuing with profile page", err);
          // Don't set error or return - continue with the rest of the profile
        }
        
        // Fetch download history with book details
        try {
          // Check if user exists before fetching
          if (!user?.id) {
            console.warn("User ID not available for download history");
            setDownloadHistory([]);
            clearTimeout(timeoutId);
            setIsLoading(false);
            return;
          }

          // SIMPLIFIED APPROACH: Fetch directly with a join query
          // This avoids multiple queries that could time out
          const { data: downloadData, error: downloadError } = await supabase
            .from('download_logs')
            .select(`
              id,
              downloaded_at,
              books (
                id,
                title,
                author,
                cover_url
              )
            `)
            .eq('user_id', user.id)
            .order('downloaded_at', { ascending: false })
            .limit(10);
            
          if (downloadError) {
            console.error('Error fetching download logs:', downloadError);
            throw new Error(`Failed to fetch download history: ${downloadError.message}`);
          }
          
          if (downloadData && downloadData.length > 0) {
            // Format the data from the join query
            const formattedDownloads = downloadData.map((item: any) => ({
              id: item.id,
              book: item.books || { 
                id: 'unknown',
                title: 'Unknown Book', 
                author: 'Unknown Author', 
                cover_url: '' 
              },
              downloaded_at: item.downloaded_at
            }));
            
            setDownloadHistory(formattedDownloads);
          } else {
            // No downloads is a valid state
            setDownloadHistory([]);
          }
        } catch (err) {
          console.error('Error in download history processing:', err);
          // Set error but continue showing the profile
          setError('Could not load download history. Try the refresh button or running the SQL fix.');
        }
      } catch (err) {
        console.error('Fatal error in profile page:', err);
        setError((err as Error).message || 'An unexpected error occurred');
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    
    fetchDownloadHistory();
  }, [user, checkRemainingQuota, retryCount]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Unknown date';
    }
  };

  if (authLoading) {
    return (
      <Container>
        <LoadingState>{t('common.loading')}</LoadingState>
      </Container>
    );
  }

  // Display the profile even while downloads are loading
  const displayUser = user || FALLBACK_USER;
  const displayProfile = profile || FALLBACK_PROFILE;

  // Safely calculate quota
  const safeRemainingQuota = remainingQuota !== undefined && remainingQuota !== null 
    ? remainingQuota 
    : displayProfile.daily_quota;
  const quotaUsed = Math.max(0, displayProfile.daily_quota - safeRemainingQuota);
  const quotaPercentUsed = Math.min(100, (quotaUsed / Math.max(1, displayProfile.daily_quota)) * 100);

  return (
    <Container>
      <Header>
        <Title>
          <FiUser /> {t('profile.title', 'Profile')}
        </Title>
        <RefreshButton onClick={handleRefresh} disabled={isLoading}>
          <FiRefreshCw /> {isLoading ? t('common.loading', 'Loading...') : t('common.refresh', 'Refresh')}
        </RefreshButton>
      </Header>
      
      {error && (
        <Alert>
          <FiAlertCircle />
          {error}
        </Alert>
      )}
      
      <Card>
        <CardTitle>{t('profile.userInfo', 'User Information')}</CardTitle>
        <ProfileInfo>
          <InfoItem>
            <InfoLabel>{t('auth.username', 'Username')}</InfoLabel>
            <InfoValue>{displayProfile.username}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>{t('auth.email', 'Email')}</InfoLabel>
            <InfoValue>{displayUser.email}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>{t('profile.quota', 'Daily Quota')}</InfoLabel>
            <InfoValue>
              {quotaUsed} / {displayProfile.daily_quota} {t('profile.downloads', 'Downloads').toLowerCase()}
            </InfoValue>
            <QuotaBar>
              <QuotaProgress percent={quotaPercentUsed} />
            </QuotaBar>
          </InfoItem>
        </ProfileInfo>
      </Card>
      
      <Card>
        <CardTitle>
          <span>
            <FiDownload /> {t('profile.downloadHistory', 'Download History')}
          </span>
          {isLoading && <span>Loading...</span>}
        </CardTitle>
        
        {isLoading ? (
          <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
        ) : downloadHistory.length > 0 ? (
          <DownloadList>
            {downloadHistory.map((item) => (
              <DownloadItem key={item.id}>
                <BookCover 
                  src={item.book.cover_url || 'https://via.placeholder.com/50x75?text=No+Cover'} 
                  alt={item.book.title}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/50x75?text=No+Cover';
                  }}
                />
                <DownloadInfo>
                  <BookTitle>{item.book.title}</BookTitle>
                  <DownloadDate>{formatDate(item.downloaded_at)}</DownloadDate>
                </DownloadInfo>
              </DownloadItem>
            ))}
          </DownloadList>
        ) : (
          <EmptyState>{t('profile.noDownloads', 'No download history found')}</EmptyState>
        )}
      </Card>
    </Container>
  );
};

export default ProfilePage;
