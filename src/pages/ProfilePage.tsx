import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUser, FiDownload, FiAlertCircle } from 'react-icons/fi';
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

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchDownloadHistory = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        setIsLoading(true);
        
        // Check remaining quota
        await checkRemainingQuota();
        
        // Fetch download history with book details
        const supabaseClient = supabase;
        
        if (!supabaseClient) {
          throw new Error('Supabase client is not initialized');
        }
        
        try {
          const { data: downloads, error: downloadsError } = await supabaseClient
            .from('download_logs')
            .select(`
              id,
              downloaded_at,
              book_id,
              user_id
            `)
            .eq('user_id', user.id)
            .order('downloaded_at', { ascending: false })
            .limit(10);
          
          if (downloadsError) {
            console.error('Error fetching download logs:', downloadsError);
            throw downloadsError;
          }
          
          if (downloads && downloads.length > 0) {
            // Fetch books separately to avoid relationship issues
            const bookIds = downloads.map(dl => dl.book_id);
            
            const { data: booksData, error: booksError } = await supabaseClient
              .from('books')
              .select('*')
              .in('id', bookIds);
              
            if (booksError) {
              console.error('Error fetching books:', booksError);
              throw booksError;
            }
            
            // Create a map of book ids to book objects
            const booksMap = (booksData || []).reduce((map: Record<string, Book>, book: Book) => {
              map[book.id] = book;
              return map;
            }, {} as Record<string, Book>);
            
            // Combine download logs with book data
            const formattedDownloads = downloads.map((item: { id: string; book_id: string; downloaded_at: string }) => ({
              id: item.id,
              book: booksMap[item.book_id] || { id: item.book_id, title: 'Unknown Book', author: '', cover_url: '' } as Book,
              downloaded_at: item.downloaded_at
            }));
            
            setDownloadHistory(formattedDownloads);
          } else {
            setDownloadHistory([]);
          }
        } catch (err) {
          console.error('Error in download history fetching:', err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
          setDownloadHistory([]);
        }
      } catch (err) {
        console.error('Error fetching download history:', err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDownloadHistory();
  }, [user, checkRemainingQuota]);

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
      <Container>
        <LoadingState>{t('common.loading')}</LoadingState>
      </Container>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  const quotaUsed = profile.daily_quota - (remainingQuota || 0);
  const quotaPercentUsed = (quotaUsed / profile.daily_quota) * 100;

  return (
    <Container>
      <Header>
        <Title>
          <FiUser /> {t('profile.title')}
        </Title>
      </Header>
      
      {error && (
        <Alert>
          <FiAlertCircle />
          {error}
        </Alert>
      )}
      
      <Card>
        <CardTitle>{t('profile.userInfo')}</CardTitle>
        <ProfileInfo>
          <InfoItem>
            <InfoLabel>{t('auth.username')}</InfoLabel>
            <InfoValue>{profile.username}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>{t('auth.email')}</InfoLabel>
            <InfoValue>{user.email}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>{t('profile.quota')}</InfoLabel>
            <InfoValue>
              {quotaUsed} / {profile.daily_quota} {t('profile.downloads').toLowerCase()}
            </InfoValue>
            <QuotaBar>
              <QuotaProgress percent={quotaPercentUsed} />
            </QuotaBar>
          </InfoItem>
        </ProfileInfo>
      </Card>
      
      <Card>
        <CardTitle>
          <FiDownload /> {t('profile.downloadHistory')}
        </CardTitle>
        
        {downloadHistory.length > 0 ? (
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
          <EmptyState>{t('profile.noDownloads')}</EmptyState>
        )}
      </Card>
    </Container>
  );
};

export default ProfilePage;
