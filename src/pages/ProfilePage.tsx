import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUser, FiDownload, FiAlertCircle, FiRefreshCw, FiBook } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useDownloads } from '../hooks/useDownloads';
import theme from '../styles/theme';

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100%;
  background-color: ${props => props.theme.colors.background};
  padding: ${theme.spacing.xl} 0;
  
  body[data-theme='dark'] & {
    background-color: ${({ theme }) => theme.colors.background};
  }
`;

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 ${theme.spacing.xl};
  
  @media (max-width: 768px) {
    padding: 0 ${theme.spacing.lg};
  }
  
  @media (max-width: 480px) {
    padding: 0 ${theme.spacing.md};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Title = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  color: ${props => props.theme.colors.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-weight: ${theme.typography.fontWeight.bold};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 60px;
    height: 3px;
    background-color: ${props => props.theme.colors.secondary};
    border-radius: ${theme.borderRadius.full};
  }
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.primary};
    
    &::after {
      background-color: ${({ theme }) => theme.colors.secondary};
    }
  }
  
  @media (max-width: 480px) {
    margin-bottom: ${theme.spacing.md};
  }
`;

const Card = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  
  body[data-theme='dark'] & {
    background-color: ${({ theme }) => theme.colors.card};
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
  
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
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.primary};
    border-bottom-color: ${({ theme }) => theme.colors.border};
  }
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
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const InfoValue = styled.span`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.text};
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const QuotaBar = styled.div`
  height: 8px;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${theme.borderRadius.full};
  margin-top: ${theme.spacing.sm};
  overflow: hidden;
  
  body[data-theme='dark'] & {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
  }
`;

const QuotaProgress = styled.div<{ percent: number }>`
  height: 100%;
  width: ${({ percent }) => `${percent}%`};
  background-color: ${({ percent, theme }) => 
    percent < 50 ? theme.colors.success : 
    percent < 80 ? theme.colors.warning : 
    theme.colors.error};
  border-radius: ${theme.borderRadius.full};
  transition: width 0.3s ease;
`;

const DownloadList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const DownloadItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${theme.borderRadius.md};
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.sm};
  }
  
  body[data-theme='dark'] & {
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
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
  font-weight: ${theme.typography.fontWeight.medium};
  margin-bottom: ${theme.spacing.xs};
  color: ${props => props.theme.colors.text};
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const BookAuthor = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
  margin-bottom: ${theme.spacing.xs};
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const DownloadDate = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${props => props.theme.colors.textLight};
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${theme.borderRadius.md};
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.textLight};
    background-color: ${({ theme }) => theme.colors.backgroundAlt};
  }
`;

const Alert = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background-color: ${props => props.theme.colors.error}20;
  color: ${props => props.theme.colors.error};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.lg};
  
  body[data-theme='dark'] & {
    background-color: ${({ theme }) => theme.colors.error}30;
    color: ${({ theme }) => theme.colors.error};
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${props => props.theme.colors.textLight};
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const RefreshButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.typography.fontSize.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryLight}15;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  body[data-theme='dark'] & {
    color: ${({ theme }) => theme.colors.primary};
    
    &:hover {
      background-color: ${({ theme }) => theme.colors.primaryLight}20;
    }
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
  const { user, profile, isLoading: authLoading } = useAuth();
  const { remainingQuota, checkRemainingQuota } = useDownloads();
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  
  // Cache history to avoid flickering during reloads
  const cachedHistoryRef = useRef<DownloadHistoryItem[]>([]);
  const cachedHistory = cachedHistoryRef.current;

  // Handler to manually refresh data
  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
    checkRemainingQuota();
  };

  // Effect to fetch download history
  useEffect(() => {
    // Skip if no user or already loading
    if (!user || authLoading) return;
    
    fetchDownloadHistory();
    
    async function fetchDownloadHistory() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Ensure user is not null before proceeding
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Fetch user download history
        // The user ID from auth is directly used as the profile ID
        const userId = user.id;
        
        // Verify the profile exists (optional check)
        const { data: profileCheck, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
          
        if (profileError) {
          throw new Error(`Error fetching profile: ${profileError.message}`);
        }
        
        if (!profileCheck) {
          throw new Error('Profile not found');
        }
        
        // Then get the download history
        const { data, error: historyError } = await supabase
          .from('download_logs')
          .select(`
            id,
            downloaded_at,
            book:books (
              id,
              title,
              author,
              cover_url
            )
          `)
          .eq('user_id', userId)
          .order('downloaded_at', { ascending: false })
          .limit(20);
        
        if (historyError) {
          throw new Error(`Error fetching download history: ${historyError.message}`);
        }
        
        // Validate and transform the data
        const validHistory = data
          .filter(item => item.book !== null && item.book !== undefined)
          .map(item => {
            // Type guard for book property
            const bookData = item.book;
            
            // Handle both array and single object cases with proper null checks
            const bookInfo = Array.isArray(bookData) ? bookData[0] : bookData;
            
            // Ensure we have valid book data before accessing properties
            if (!bookInfo) {
              return {
                id: item.id,
                downloaded_at: item.downloaded_at,
                book: {
                  id: 'unknown',
                  title: 'Unknown Book',
                  author: 'Unknown Author',
                  cover_url: 'https://via.placeholder.com/50x75?text=No+Cover'
                }
              };
            }
            
            return {
              id: item.id,
              downloaded_at: item.downloaded_at,
              book: {
                id: bookInfo.id || 'unknown',
                title: bookInfo.title || 'Unknown Book',
                author: bookInfo.author || 'Unknown Author',
                cover_url: bookInfo.cover_url || 'https://via.placeholder.com/50x75?text=No+Cover'
              }
            };
          });

        // Update the state and cache
        setDownloadHistory(validHistory);
        cachedHistoryRef.current = validHistory;
        setHistoryLoaded(true);
      } catch (err) {
        console.error('Error in download history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load download history');
        // Keep the cached history if we have an error
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, authLoading, retryCount]);
  
  // Check quota on load
  useEffect(() => {
    if (user && !authLoading) {
      // Only check quota if we don't already have it or on refresh
      if (remainingQuota === undefined || retryCount > 0) {
        checkRemainingQuota();
      }
    }
  }, [user, checkRemainingQuota, retryCount, cachedHistory]);

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
      <PageWrapper>
        <Container>
          <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
        </Container>
      </PageWrapper>
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

  // Use the history we already have while loading new data
  const displayHistory = historyLoaded || cachedHistory.length > 0 
    ? downloadHistory.length > 0 ? downloadHistory : cachedHistory
    : [];

  return (
    <PageWrapper>
      <Container>
        <Header>
          <Title>
            <FiUser /> {t('profile.title', 'Profile')}
          </Title>
          <RefreshButton onClick={handleRefresh} disabled={isLoading}>
            <LoadingIcon $isLoading={isLoading} /> 
            {isLoading ? t('common.loading', 'Loading...') : t('common.refresh', 'Refresh')}
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
                      <FiBook style={{ marginRight: theme.spacing.xs, verticalAlign: 'middle' }} /> 
                      {formatDate(item.downloaded_at)}
                    </DownloadDate>
                  </DownloadInfo>
                </DownloadItem>
              ))}
            </DownloadList>
          ) : (
            <EmptyState>{t('profile.noDownloads', 'No download history found')}</EmptyState>
          )}
        </Card>
      </Container>
    </PageWrapper>
  );
};

export default ProfilePage;
