import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiUser, FiDownload, FiAlertCircle, FiRefreshCw, FiUpload, FiCreditCard, FiBook, FiAward } from 'react-icons/fi';
import { supabase } from '../services/supabase';
import { useDownloads } from '../hooks/useDownloads';
import theme from '../styles/theme';
import { AdminContainer, LoadingState } from '../styles/adminStyles';
import { Profile } from '../types/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserLastLogin } from '../services/activityService';

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
    border-radius: ${theme.borderRadius.full};
  }
`;

const PageTitle = styled.h1`
  font-size: ${theme.typography.fontSize['5xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${props => props.theme.colors.primary};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  padding-bottom: ${props => props.theme.spacing.sm};
  border-bottom: 4px solid ${props => props.theme.colors.secondary};
  font-family: ${props => props.theme.typography.fontFamily.heading};
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
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

const CardTitle = styled.h2`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${props => props.theme.colors.primary};
  margin: 0 0 ${theme.spacing.md} 0;
  padding-bottom: ${theme.spacing.xs};
  border-bottom: 2px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  background-color: ${props => props.theme.colors.card};
  border: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};
`;

const InfoLabel = styled.span`
  font-size: ${theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
`;

const InfoValue = styled.span`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.text};
  word-break: break-all;
  overflow-wrap: anywhere;
`;

const QuotaBar = styled.div`
  width: 70%;
  height: 3px;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${theme.borderRadius.full};
  margin: ${theme.spacing.sm} auto;
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

const QuotasContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
`;

const QuotaCard = styled.div`
  flex: 1;
  background-color: ${props => props.theme.colors.backgroundAlt};
  padding: ${theme.spacing.xl};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.md};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const QuotaTitle = styled.h3`
  margin: 0;
  font-size: ${theme.typography.fontSize.md};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.primary};
  text-align: center;
`;

const QuotaValue = styled.div`
  margin: ${theme.spacing.sm} 0;
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  text-align: center;
  color: ${props => props.theme.colors.text};
`;

const DownloadList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const DownloadItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt}10;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.sm};
  }
`;

const BookCover = styled.img`
  width: 40px;
  height: 60px;
  object-fit: cover;
  border-radius: ${theme.borderRadius.sm};
  box-shadow: ${props => props.theme.shadows.sm};
`;

const DownloadInfo = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

const BookTitle = styled.div`
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.primary};
`;

const BookAuthor = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
`;

const DownloadDate = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xs};
  color: ${props => props.theme.colors.textLight};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
`;

const LoadMoreButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  font-size: ${theme.typography.fontSize.sm};
  cursor: pointer;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  &:hover { text-decoration: underline; }
`;

const SubscriptionInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
`;

const Badge = styled.span<{plan: string}>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  background-color: ${props => props.plan === 'premium'
    ? props.theme.colors.success
    : props.theme.colors.backgroundAlt};
  color: ${props => props.plan === 'premium' ? '#fff' : props.theme.colors.text};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
`;

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};
`;

const AvatarWrapper = styled.div`
  position: relative;
  display: inline-block;
  margin-right: ${theme.spacing.lg};
`;

const Avatar = styled.img`
  width: 100px;
  height: 100px;
  border: 3px solid ${props => props.theme.colors.primary};
  box-shadow: ${props => props.theme.shadows.sm};
  border-radius: 50%;
  object-fit: cover;
  margin-right: ${theme.spacing.lg};
  transition: transform 0.3s ease;
  cursor: pointer;
`;

const EditAvatarIcon = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: ${props => props.theme.colors.primary};
  border-radius: 50%;
  padding: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.card};
  cursor: pointer;
`;

const PremiumBadge = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  background-color: gold;
  border-radius: ${props => props.theme.borderRadius.full};
  padding: ${props => props.theme.spacing.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
`;

const FreeBadge = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  background-color: ${props => props.theme.colors.primary};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  color: #fff;
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const UserName = styled.h2`
  margin: 0;
  font-size: ${theme.typography.fontSize['2xl']};
  color: ${props => props.theme.colors.text};
`;

const FlexRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
`;

const IconWrapper = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.full};
  background-color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.card};
  margin-right: ${theme.spacing.sm};
`;

const Alert = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background-color: ${props => props.theme.colors.error}20;
  color: ${props => props.theme.colors.error};
  padding: ${theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: ${props => props.theme.spacing.md};
  border-left: 3px solid ${props => props.theme.colors.error};
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.secondary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.secondary};
    color: ${props => props.theme.colors.card};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    &:hover {
      background-color: transparent;
      color: ${props => props.theme.colors.secondary};
      transform: none;
    }
  }
`;

const LoadingIcon = styled(FiRefreshCw)<{$isLoading?: boolean}>`
  animation: ${props => props.$isLoading ? 'rotate 1.5s linear infinite' : 'none'};

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  padding: ${theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.textLight};
`;

const StatusBadge = styled.span<{variant: 'online' | 'offline'}>`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  background-color: ${props => props.variant === 'online' ? props.theme.colors.success : props.theme.colors.backgroundAlt};
  color: ${props => props.variant === 'online' ? '#fff' : props.theme.colors.textLight};
`;

const MetaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.sm};
  align-items: center;
`;

const MetaLabel = styled.span`
  font-size: ${theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
`;

// Fallback values for profile display only when needed
const DEFAULT_QUOTA = 3;
const FALLBACK_USER = { email: 'user@example.com' };
const FALLBACK_PROFILE: Profile = {
  id: '',
  username: '',
  full_name: '',
  avatar_url: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  daily_quota: DEFAULT_QUOTA,
  subscription_plan: 'free',
  referral_code: '',
  referrals_count: 0,
  website: '',
  is_admin: false,
  monthly_request_quota: 0
};

interface SimpleBook {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  type: string;
  seq_no: number;
  slug: string;
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
  const [userProfileData, setUserProfileData] = useState<Profile | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [historyLoaded, setHistoryLoaded] = useState<boolean>(false);
  const cachedHistoryRef = useRef<DownloadHistoryItem[]>([]);
  const cachedHistory = cachedHistoryRef.current;
  const [requestQuotaData, setRequestQuotaData] = useState<{ used: number; max: number; remaining: number } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const [userStatus, setUserStatus] = useState<'online'|'offline'>('offline');
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [actualLastLogin, setActualLastLogin] = useState<string | null>(null);

  const fetchDownloadHistory = async (pageParam = 0, append = false): Promise<void> => {
    if (!user) return;
    if (!append) {
      setDownloadHistory([]);
      setHistoryLoaded(false);
      setHasMore(true);
      setPage(pageParam);
    }
    try {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: downloadData, error: downloadError } = await supabase
        .from('download_logs')
        .select('id, book_id, downloaded_at')
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false })
        .range(from, to);

      if (downloadError) {
        console.error('Error fetching download history:', downloadError);
        throw new Error(t('profile.errorFetchingHistory', 'Could not load download history'));
      }

      if (!downloadData || downloadData.length === 0) {
        setDownloadHistory([]);
        setHistoryLoaded(true);
        return;
      }

      const bookIds = downloadData.map(d => d.book_id);
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('id, title, author, cover_url, type, seq_no, slug')
        .in('id', bookIds);

      if (bookError) {
        console.error('Error fetching books for download history:', bookError);
        throw new Error(t('profile.errorFetchingBooks', 'Could not load book details'));
      }

      const bookMap = (bookData || []).reduce((map, book) => {
        map[book.id] = book;
        return map;
      }, {} as Record<string, SimpleBook>);

      const historyWithDetails = downloadData.map(download => {
        const book = bookMap[download.book_id];
        return {
          id: download.id,
          book: book || {
            id: download.book_id,
            title: t('profile.unknownBook', 'Unknown Book'),
            author: t('profile.unknownAuthor', 'Unknown Author'),
            cover_url: 'https://via.placeholder.com/50x75?text=No+Cover',
            type: '',
            seq_no: 0,
            slug: ''
          },
          downloaded_at: download.downloaded_at
        };
      });

      setDownloadHistory(append ? [...downloadHistory, ...historyWithDetails] : historyWithDetails);
      cachedHistoryRef.current = append ? [...cachedHistoryRef.current, ...historyWithDetails] : historyWithDetails;
      setHistoryLoaded(true);
      setHasMore(!!downloadData && downloadData.length === PAGE_SIZE);
      setPage(pageParam);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError(t('common.unknownError', 'An unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async (): Promise<void> => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setUserProfileData(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchRequestQuota = async (): Promise<void> => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_user_request_quota', { user_id: user.id });
      if (error) throw error;
      setRequestQuotaData(data);
    } catch (err) {
      console.error('Error fetching request quota:', err);
    }
  };

  const fetchStatus = async () => {
    if (!user) return;
    
    // Remove the .single() call that was causing the error
    const { data, error } = await supabase
      .from('user_sessions')
      .select('is_active, last_active_at, started_at')
      .eq('user_id', user.id)
      .order('last_active_at', { ascending: false })
      .limit(1);
      
    // Handle case when no session exists
    if (error) {
      console.error('Error fetching user session status:', error);
      return;
    }
    
    // If we have session data, use it, otherwise set default values
    if (data && data.length > 0) {
      setUserStatus(data[0].is_active ? 'online' : 'offline');
      setLastLogin(data[0].last_active_at || data[0].started_at);
    } else {
      // Default to offline if no session exists
      setUserStatus('offline');
      setLastLogin(null);
    }
    // Fetch actual last login timestamp
    try {
      const loginTs = await getUserLastLogin(user.id);
      setActualLastLogin(loginTs);
    } catch (err) {
      console.error('Error fetching actual last login:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDownloadHistory(0, false);
      checkRemainingQuota();
      fetchRequestQuota();
      fetchStatus();
    }
  }, [user]);

  // Handler to manually refresh data
  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setHistoryLoaded(false);
    setPage(0);
    setHasMore(true);
    fetchUserProfile();
    fetchDownloadHistory(0, false);
    checkRemainingQuota();
    fetchRequestQuota();
    fetchStatus();
  };

  const handleAvatarClick = () => avatarInputRef.current?.click();
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsLoading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `avatars/${user.id}/${fileName}`;
      // upload file
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      // get public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      // update profile with avatar URL
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      setUserProfileData(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Display profile and user info (with fallbacks to prevent UI errors)
  const displayProfile = userProfileData ?? FALLBACK_PROFILE;
  const displayUser = user || FALLBACK_USER;
  const referralLink = `${window.location.origin}/signup?ref=${displayProfile.referral_code}`;

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
  const requestUsed = requestQuotaData?.used ?? 0;
  const requestMax = requestQuotaData?.max ?? displayProfile.monthly_request_quota ?? 0;
  const requestPercentUsed = requestMax
    ? Math.min(100, (requestUsed / requestMax) * 100)
    : 0;

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
      
      <UserHeader>
        <AvatarWrapper onClick={handleAvatarClick}>
          <Avatar src={displayProfile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'} alt="Avatar" />
          <EditAvatarIcon><FiUpload size={16} /></EditAvatarIcon>
          {displayProfile.subscription_plan === 'premium' ? (
            <PremiumBadge><FiAward size={16} /></PremiumBadge>
          ) : (
            <FreeBadge>{t('profile.freeBadge', 'FREE')}</FreeBadge>
          )}
        </AvatarWrapper>
        <UserDetails>
          <UserName>{displayProfile.username || displayUser.email?.split('@')[0]}</UserName>
          <InfoValue>{displayUser.email || ''}</InfoValue>
          <StatusBadge variant={userStatus}>
            {userStatus === 'online' ? t('profile.online', 'Online') : t('profile.offline', 'Offline')}
          </StatusBadge>
          <MetaInfo>
            <MetaLabel>{t('profile.joined', 'Joined')}: {formatDate(displayProfile.created_at)}</MetaLabel>
            {lastLogin && <MetaLabel>{t('profile.lastActive', 'Last Active')}: {formatDate(lastLogin)}</MetaLabel>}
            {actualLastLogin && <MetaLabel>{t('profile.lastLogin', 'Last Login')}: {formatDate(actualLastLogin)}</MetaLabel>}
          </MetaInfo>
        </UserDetails>
      </UserHeader>
      
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
      
      <input type="file" accept="image/*" ref={avatarInputRef} style={{ display: 'none' }} onChange={handleAvatarChange} />
      <FlexRow>
        <Card style={{ width: '100%', minWidth: '280px' }}>
          <CardTitle>
            <IconWrapper><FiCreditCard size={24} /></IconWrapper>
            {t('profile.subscription', 'Subscription & Quota')}
          </CardTitle>
          {/* Quota overview section */}
          <QuotasContainer>
            <QuotaCard>
              <QuotaTitle>{t('profile.dailyQuota', 'Daily Quota')}</QuotaTitle>
              <QuotaValue>
                {t('profile.downloads', 'Downloads')}: {quotaUsed} / {displayProfile.daily_quota}
              </QuotaValue>
              <QuotaBar><QuotaProgress percent={quotaPercentUsed} /></QuotaBar>
            </QuotaCard>
            <QuotaCard>
              <QuotaTitle>{t('profile.monthlyQuota', 'Monthly Quota')}</QuotaTitle>
              <QuotaValue>
                {t('profile.requests', 'Requests')}: {requestUsed} / {requestMax}
              </QuotaValue>
              <QuotaBar><QuotaProgress percent={requestPercentUsed} /></QuotaBar>
            </QuotaCard>
          </QuotasContainer>
          <SubscriptionInfo>
            <InfoItem>
              <InfoLabel>{t('profile.plan', 'Plan')}</InfoLabel>
              <Badge plan={displayProfile.subscription_plan}>
                {displayProfile.subscription_plan.toUpperCase()}
              </Badge>
            </InfoItem>
            <InfoItem>
              <InfoLabel>{t('profile.referralLink', 'Referral Link')}</InfoLabel>
              <InfoValue>
                <a href={referralLink} target="_blank" rel="noopener noreferrer">
                  {referralLink}
                </a>
              </InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>{t('profile.referralsCount', 'Referrals Count')}</InfoLabel>
              <InfoValue>{displayProfile.referrals_count}</InfoValue>
            </InfoItem>
          </SubscriptionInfo>
        </Card>
      </FlexRow>
      <Card>
        <CardTitle>
          <IconWrapper><FiDownload /></IconWrapper>
          {t('profile.downloadHistory', 'Download History')}
        </CardTitle>
        {isLoading && displayHistory.length === 0 && (
          <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
        )}
        {!isLoading && (
          <DownloadList>
            {displayHistory.map(item => (
              <DownloadItem
                key={item.id}
                onClick={() => {
                  const b = Array.isArray(item.book) ? item.book[0] : item.book;
                  const typePath = b?.type === 'audiobook' ? 'audiobook' : 'book';
                  if (b && b.seq_no && b.slug) {
                    navigate(`/${typePath}/${b.seq_no}/${b.slug}.html`);
                  }
                }}
              >
                <BookCover
                  src={Array.isArray(item.book) ? item.book[0]?.cover_url : item.book?.cover_url}
                  alt={Array.isArray(item.book) ? item.book[0]?.title : item.book?.title}
                  onError={e => {(e.target as HTMLImageElement).src = 'https://via.placeholder.com/40x60?text=No+Cover';}}
                />
                <DownloadInfo>
                  <BookTitle>{Array.isArray(item.book) ? item.book[0]?.title : item.book?.title}</BookTitle>
                  {Array.isArray(item.book)
                    ? item.book[0]?.author && <BookAuthor>{item.book[0].author}</BookAuthor>
                    : item.book?.author && <BookAuthor>{item.book.author}</BookAuthor>
                  }
                  <DownloadDate><FiBook /> {formatDate(item.downloaded_at)}</DownloadDate>
                </DownloadInfo>
              </DownloadItem>
            ))}
            {displayHistory.length === 0 && (
              <EmptyState>{t('profile.noDownloads', 'No download history found')}</EmptyState>
            )}
          </DownloadList>
        )}
        {hasMore && (
          <LoadMoreButton onClick={() => fetchDownloadHistory(page + 1, true)}>
            {t('profile.loadMore', 'Load More')}
          </LoadMoreButton>
        )}
      </Card>
    </AdminContainer>
  );
};

export default ProfilePage;
