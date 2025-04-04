import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUser, FiDownload, FiAlertCircle, FiRefreshCw, FiBook } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useDownloads } from '../hooks/useDownloads';
import theme from '../styles/theme';
import { AdminContainer, LoadingState } from '../styles/adminStyles';

const PageHeader = styled.div`
  margin-bottom: ${props => props.theme.spacing.xl};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -${props => props.theme.spacing.sm};
    left: 0;
    width: 80px;
    height: 3px;
    background-color: ${props => props.theme.colors.secondary};
    border-radius: ${props => props.theme.borderRadius.full};
  }
`;

const PageTitle = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  color: ${props => props.theme.colors.primary};
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  font-family: ${props => props.theme.typography.fontFamily.heading};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const Card = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
  border: 1px solid ${props => props.theme.colors.border};
  transition: all 0.3s ease;
  
  @media (max-width: 480px) {
    padding: ${theme.spacing.lg};
  }
`;

const CardTitle = styled.h2`
  font-size: ${theme.typography.fontSize.xl};
  color: ${props => props.theme.colors.primary};
  margin: 0 0 ${theme.spacing.lg} 0;
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: ${props => props.theme.typography.fontFamily.heading};
`;

const ProfileInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.lg};
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const InfoLabel = styled.span`
  font-size: ${theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
`;

const InfoValue = styled.span`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.text};
`;

const QuotaBar = styled.div`
  height: 8px;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${theme.borderRadius.full};
  margin-top: ${theme.spacing.sm};
  overflow: hidden;
`;

const QuotaProgress = styled.div<{percent: number}>`
  width: ${({percent}) => `${percent}%`};
  height: 100%;
  background-color: ${({percent}) => 
    percent < 50 ? props => props.theme.colors.success :
    percent < 85 ? props => props.theme.colors.warning :
    props => props.theme.colors.error
  };
  transition: width 0.3s ease;
`;

const DownloadList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const DownloadItem = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt}10;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.sm};
  }
`;

const BookCover = styled.img`
  width: 50px;
  height: 75px;
  object-fit: cover;
  border-radius: ${theme.borderRadius.sm};
  box-shadow: ${props => props.theme.shadows.sm};
`;

const DownloadInfo = styled.div`
  flex-grow: 1;
`;

const BookTitle = styled.div`
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${theme.spacing.xs};
`;

const BookAuthor = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
  margin-bottom: ${theme.spacing.xs};
`;

const DownloadDate = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const EmptyState = styled.div`
  padding: ${theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.textLight};
`;

const Alert = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background-color: ${props => props.theme.colors.error}20;
  color: ${props => props.theme.colors.error};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.md};
  border-left: 3px solid ${props => props.theme.colors.error};
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: none;
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.primary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.md};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.primary}10;
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingIcon = styled(FiRefreshCw)<{$isLoading?: boolean}>`
  animation: ${props => props.$isLoading ? 'rotate 1.5s linear infinite' : 'none'};

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// Fallback values for profile display only when needed
const DEFAULT_QUOTA = 3;
const FALLBACK_USER = { email: 'user@example.com' };
const FALLBACK_PROFILE = { username: 'User', daily_quota: DEFAULT_QUOTA };

interface SimpleBook {
  id: string;
  title: string;
  author: string;
  cover_url: string;
}

interface DownloadHistoryItem {
  id: string;
  book: SimpleBook | SimpleBook[];
  downloaded_at: string;
}

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { remainingQuota, checkRemainingQuota } = useDownloads();
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [historyLoaded, setHistoryLoaded] = useState<boolean>(false);
  const cachedHistoryRef = useRef<DownloadHistoryItem[]>([]);
  const cachedHistory = cachedHistoryRef.current;
  
  // Handler to manually refresh data
  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setHistoryLoaded(false);
    fetchDownloadHistory();
    checkRemainingQuota();
  };
  
  // On mount, fetch data
  useEffect(() => {
    if (user) {
      fetchDownloadHistory();
      checkRemainingQuota();
    }
  }, [user]);
  
  const fetchDownloadHistory = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // First, get download IDs from the user's download history
      const { data: downloadData, error: downloadError } = await supabase
        .from('downloads')
        .select('id, book_id, downloaded_at')
        .order('downloaded_at', { ascending: false })
        .limit(20);
        
      if (downloadError) {
        console.error('Error fetching download history:', downloadError);
        throw new Error(t('profile.errorFetchingHistory', 'Could not load download history'));
      }
      
      if (!downloadData || downloadData.length === 0) {
        setDownloadHistory([]);
        setHistoryLoaded(true);
        return;
      }
      
      // Create a map of book IDs to fetch books in a single query
      const bookIds = downloadData.map(d => d.book_id);
      
      // Fetch books by IDs
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('id, title, author, cover_url')
        .in('id', bookIds);
        
      if (bookError) {
        console.error('Error fetching books for download history:', bookError);
        throw new Error(t('profile.errorFetchingBooks', 'Could not load book details'));
      }
      
      // Create a map for fast book lookups
      const bookMap = (bookData || []).reduce((map, book) => {
        map[book.id] = book;
        return map;
      }, {} as Record<string, SimpleBook>);
      
      // Map the downloads with book details
      const historyWithDetails = downloadData.map(download => {
        const book = bookMap[download.book_id];
        return {
          id: download.id,
          book: book || {
            id: download.book_id,
            title: t('profile.unknownBook', 'Unknown Book'),
            author: t('profile.unknownAuthor', 'Unknown Author'),
            cover_url: 'https://via.placeholder.com/50x75?text=No+Cover'
          },
          downloaded_at: download.downloaded_at
        };
      });
      
      setDownloadHistory(historyWithDetails);
      cachedHistoryRef.current = historyWithDetails;
      setHistoryLoaded(true);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('common.unknownError', 'An unknown error occurred'));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Display profile and user info (with fallbacks to prevent UI errors)
  const displayUser = user || FALLBACK_USER;
  const displayProfile = user?.user_metadata || FALLBACK_PROFILE;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      // If date parsing fails, just return the raw string
      return dateString;
    }
  };
  
  // Calculate quota metrics
  const safeRemainingQuota = typeof remainingQuota === 'number' 
    ? remainingQuota 
    : displayProfile.daily_quota;
  const quotaUsed = Math.max(0, displayProfile.daily_quota - safeRemainingQuota);
  const quotaPercentUsed = Math.min(100, (quotaUsed / Math.max(1, displayProfile.daily_quota)) * 100);

  // Use the history we already have while loading new data
  const displayHistory = historyLoaded || cachedHistory.length > 0 
    ? downloadHistory.length > 0 ? downloadHistory : cachedHistory
    : [];

  return (
    <AdminContainer>
      <PageHeader>
        <PageTitle>
          <FiUser /> {t('profile.title', 'Profile')}
        </PageTitle>
      </PageHeader>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: theme.spacing.lg }}>
        <RefreshButton onClick={handleRefresh} disabled={isLoading}>
          <LoadingIcon $isLoading={isLoading} /> 
          {isLoading ? t('common.loading', 'Loading...') : t('common.refresh', 'Refresh')}
        </RefreshButton>
      </div>
      
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
            <FiDownload style={{ marginRight: theme.spacing.sm }} /> {t('profile.downloadHistory', 'Download History')}
          </span>
          {isLoading && <LoadingIcon $isLoading={true} />}
        </CardTitle>
        
        {isLoading && displayHistory.length === 0 ? (
          <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
        ) : displayHistory.length > 0 ? (
          <DownloadList>
            {displayHistory.map((item) => (
              <DownloadItem key={item.id}>
                <BookCover 
                  src={Array.isArray(item.book) 
                    ? (item.book[0]?.cover_url || 'https://via.placeholder.com/50x75?text=No+Cover')
                    : (item.book?.cover_url || 'https://via.placeholder.com/50x75?text=No+Cover')
                  } 
                  alt={Array.isArray(item.book) ? item.book[0]?.title : item.book?.title}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/50x75?text=No+Cover';
                  }}
                />
                <DownloadInfo>
                  <BookTitle>
                    {Array.isArray(item.book) ? item.book[0]?.title : item.book?.title}
                  </BookTitle>
                  {Array.isArray(item.book) 
                    ? (item.book[0]?.author && <BookAuthor>{item.book[0].author}</BookAuthor>)
                    : (item.book?.author && <BookAuthor>{item.book.author}</BookAuthor>)
                  }
                  <DownloadDate>
                    <FiBook /> {formatDate(item.downloaded_at)}
                  </DownloadDate>
                </DownloadInfo>
              </DownloadItem>
            ))}
          </DownloadList>
        ) : (
          <EmptyState>{t('profile.noDownloads', 'No download history found')}</EmptyState>
        )}
      </Card>
    </AdminContainer>
  );
};

export default ProfilePage;
