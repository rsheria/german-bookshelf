import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUser, FiDownload, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useDownloads } from '../hooks/useDownloads';

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
  book: SimpleBook;
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Add state to track if data has ever been successfully loaded
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // Add a cache for download history
  const [cachedHistory, setCachedHistory] = useState<DownloadHistoryItem[]>([]);

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

  // Clean up timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchDownloadHistory = async () => {
      // Skip if no user, but don't set error
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Don't set loading state if we have cached history
      if (!cachedHistory.length) {
        setIsLoading(true);
      }
      setError(null);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a timeout to prevent infinite loading
      timeoutRef.current = setTimeout(() => {
        if (isLoading) {
          console.log("Download history fetch timed out");
          setIsLoading(false);
          // Keep showing cached history if we have it
          if (!cachedHistory.length) {
            setError("Database query timed out. Please run the SQL fix in Supabase and try again.");
          }
        }
      }, 10000); // 10 second timeout
      
      try {
        // Check quota first (don't block on errors)
        try {
          await checkRemainingQuota();
        } catch (err) {
          console.warn("Could not check quota, continuing with profile page", err);
        }
        
        // Check if user exists before fetching
        if (!user?.id) {
          console.warn("User ID not available for download history");
          setIsLoading(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }

        console.log("Fetching real download history for user:", user.id);
        
        // PRODUCTION-READY APPROACH:
        // First fetch download logs
        const { data: downloads, error: downloadsError } = await supabase
          .from('download_logs')
          .select('id, book_id, downloaded_at')
          .eq('user_id', user.id)
          .order('downloaded_at', { ascending: false })
          .limit(10);
          
        if (downloadsError) {
          console.error('Error fetching download logs:', downloadsError);
          setError(`Database error: ${downloadsError.message}. Please run the SQL fix in the Supabase dashboard.`);
          // Keep showing cached history
          if (cachedHistory.length) {
            setDownloadHistory(cachedHistory);
          }
          setIsLoading(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }
        
        if (!downloads || downloads.length === 0) {
          console.log("No download history found");
          setDownloadHistory([]);
          setIsLoading(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }
        
        // Then fetch the books for those downloads
        const bookIds = [...new Set(downloads.map(d => d.book_id))];
        
        const { data: books, error: booksError } = await supabase
          .from('books')
          .select('id, title, author, cover_url')
          .in('id', bookIds);
          
        if (booksError) {
          console.error('Error fetching books:', booksError);
          setError(`Book data error: ${booksError.message}. Please run the SQL fix in the Supabase dashboard.`);
          // Keep showing cached history
          if (cachedHistory.length) {
            setDownloadHistory(cachedHistory);
          }
          setIsLoading(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }
        
        // Create a map of book IDs to book objects
        const bookMap: Record<string, SimpleBook> = {};
        
        if (books) {
          books.forEach((book: any) => {
            bookMap[book.id] = {
              id: book.id,
              title: book.title || 'Unknown Book',
              author: book.author || 'Unknown Author',
              cover_url: book.cover_url || ''
            };
          });
        }
        
        // Combine download logs with book data
        const formattedDownloads = downloads.map(item => {
          // Find the book in our map, or use placeholder data
          const book = bookMap[item.book_id] || {
            id: item.book_id,
            title: `Book ${item.book_id.substring(0, 6)}`,
            author: 'Unknown Author',
            cover_url: ''
          };
          
          return {
            id: item.id,
            book,
            downloaded_at: item.downloaded_at
          };
        });
        
        console.log("Successfully loaded download history:", formattedDownloads.length);
        setDownloadHistory(formattedDownloads);
        // Save to cache for future use
        setCachedHistory(formattedDownloads);
        setHistoryLoaded(true);
      } catch (err) {
        console.error('Error in download history retrieval:', err);
        setError(`Error: ${err instanceof Error ? err.message : String(err)}. Run the SQL fix in Supabase dashboard.`);
        // Keep showing cached history
        if (cachedHistory.length) {
          setDownloadHistory(cachedHistory);
        }
      } finally {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsLoading(false);
      }
    };
    
    fetchDownloadHistory();
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
      <Container>
        <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
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

  // Use the history we already have while loading new data
  const displayHistory = historyLoaded || cachedHistory.length > 0 
    ? downloadHistory.length > 0 ? downloadHistory : cachedHistory
    : [];

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
        
        {isLoading && displayHistory.length === 0 ? (
          <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
        ) : displayHistory.length > 0 ? (
          <DownloadList>
            {displayHistory.map((item) => (
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
