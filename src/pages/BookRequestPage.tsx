import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { 
  FiLoader, 
  FiList, 
  FiPlus, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiThumbsUp,
  FiThumbsDown,
  FiExternalLink 
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import type { RequestVote } from '../types/supabase';
import { AdminContainer, LoadingState, ActionButton } from '../styles/adminStyles';
import { createPortal } from 'react-dom';

// Styled components for the page
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
  font-size: ${props => props.theme.typography.fontSize['3xl']};
  color: ${props => props.theme.colors.primary};
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  font-family: ${props => props.theme.typography.fontFamily.heading};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textLight};
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.lg};
`;

const Card = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border};
  transition: all 0.3s ease;
`;

const Tabs = styled.div`
  display: flex;
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  background-color: ${({ active, theme }) => active ? theme.colors.primary : 'transparent'};
  color: ${({ active, theme }) => active ? '#fff' : theme.colors.text};
  font-weight: ${({ active, theme }) => active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.medium};
  border: none;
  cursor: pointer;
  transition: background 0.3s, color 0.3s;
  &:hover {
    background-color: ${({ active, theme }) => active ? theme.colors.primary : theme.colors.border};
  }
  &:first-child {
    border-top-left-radius: ${props => props.theme.borderRadius.md};
    border-bottom-left-radius: ${props => props.theme.borderRadius.md};
  }
  &:last-child {
    border-top-right-radius: ${props => props.theme.borderRadius.md};
    border-bottom-right-radius: ${props => props.theme.borderRadius.md};
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${props => props.theme.spacing.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.md};
  background-color: ${props => props.theme.colors.card};
  color: ${props => props.theme.colors.text};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(45, 84, 112, 0.2);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.md};
  background-color: ${props => props.theme.colors.card};
  color: ${props => props.theme.colors.text};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(45, 84, 112, 0.2);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: ${props => props.theme.spacing.md};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.md};
  background-color: ${props => props.theme.colors.card};
  color: ${props => props.theme.colors.text};
  min-height: 120px;
  resize: vertical;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(45, 84, 112, 0.2);
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  animation: spin 1s linear infinite;
  margin-right: ${props => props.theme.spacing.sm};
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const RequestListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};
`;

const RequestListItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: ${props => props.theme.spacing.sm};
  background-color: ${props => props.theme.colors.card};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
  transition: all 0.2s ease;
  &:hover {
    box-shadow: ${props => props.theme.shadows.sm};
    transform: translateY(-2px);
  }
`;

const VoteContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-right: ${props => props.theme.spacing.md};
  width: 36px;
  button {
    background: none;
    border: none;
    cursor: pointer;
    color: ${props => props.theme.colors.textDim};
    &:hover { color: ${props => props.theme.colors.primary}; }
    &.active { color: ${props => props.theme.colors.primary}; font-weight: bold; }
  }
`;

const RequestCover = styled.img`
  width: 60px;
  height: 90px;
  object-fit: cover;
  border-radius: ${props => props.theme.borderRadius.sm};
  background-color: #f0f0f0; /* Light background for loading state */
  min-width: 60px; /* Ensure minimum width even when image fails */
`;

const RequestInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xs};
`;

const RequestTitleStyled = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  font-size: ${props => props.theme.typography.fontSize.md};
`;

const RequestAccessBadge = styled.span<{status: string}>`
  background-color: ${props => {
    switch (props.status) {
      case 'Fulfilled':
        return props.theme.colors.success;
      case 'Declined':
        return props.theme.colors.error;
      default:
        return props.theme.colors.warning;
    }
  }};
  color: white;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
`;

const RequestMeta = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.lg};
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textSecondary};
`;

const PreviewContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: ${props => props.theme.spacing.lg};
  margin: ${props => props.theme.spacing.lg} 0;
  padding: ${props => props.theme.spacing.sm};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  & img { width: 120px; height: auto; border-radius: ${props => props.theme.borderRadius.sm}; }
  & div {
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
  }
  & h3 { margin: 0; font-size: ${props => props.theme.typography.fontSize.lg}; }
  & p { margin: 0; color: ${props => props.theme.colors.textSecondary}; }
`;

const ModalOverlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; justify-content: center; align-items: center;
  overflow: hidden;
  z-index: ${props => props.theme.zIndex.modalBackdrop};
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.card};
  width: 100%; max-width: 500px;
  height: calc(100vh - ${props => props.theme.spacing.sm * 2});
  display: flex; flex-direction: column;
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  overflow: hidden;
  @media (max-width: 480px) {
    max-width: 100%;
    height: calc(100vh - ${props => props.theme.spacing.sm * 2});
  }
`;

const ModalHeader = styled.div`
  flex: 0 0 auto;
  position: sticky; top: 0; z-index: 1;
  background: ${props => props.theme.colors.card};
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ModalBody = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;
  padding-top: ${props => props.theme.spacing.md};
  padding-right: ${props => props.theme.spacing.lg};
  padding-bottom: 80px;
  padding-left: ${props => props.theme.spacing.lg};
`;

const ModalFooter = styled.div`
  flex: 0 0 auto;
  position: sticky; bottom: 0; z-index: 1;
  background: ${props => props.theme.colors.card};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex; justify-content: flex-end; gap: ${props => props.theme.spacing.sm};
`;

// Interface for book request
interface BookRequest {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  language: string;
  format: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  admin_notes: string | null;
  fulfilled_at: string | null;
  book_link?: string | null; // Link to the fulfilled book
  
  // Frontend-only properties (added by our code, not in the database)
  voteSum: number;
  myVote: number;
  cover_url?: string;
  
  // These fields don't exist in the database yet, but we extract them from description
  // and use them in the UI
  publisher?: string;
  published_year?: string;
}

// Custom hook to track monthly book request quota
const useBookRequestQuota = () => {
  const { user } = useAuth();
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);
  const [totalQuota, setTotalQuota] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkRemainingQuota = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First get the user's monthly request limit
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('monthly_request_quota')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      // Set the total quota
      const quota = profileData?.monthly_request_quota || 5;
      setTotalQuota(quota);
      
      // Use the database function to get remaining requests
      const { data, error: countError } = await supabase
        .rpc('get_remaining_book_requests', { user_uuid: user.id });
        
      if (countError) throw countError;
      
      setRemainingRequests(data);
      setError(null);
    } catch (error: any) {
      console.error('Error checking remaining book requests:', error);
      setError(error.message);
      // Fallback to a reasonable value if there's an error
      setRemainingRequests(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRemainingQuota();
  }, [user]);

  return { remainingRequests, totalQuota, loading, error, checkRemainingQuota };
};

// Multi-source book cover API function similar to what Z-Library and other sites use
const getBookCover = (isbn: string, title: string, author: string, format: string): string => {
  // Clean and normalize inputs
  const cleanIsbn = isbn?.trim().replace(/-/g, '') || '';
  const cleanTitle = encodeURIComponent(title?.trim() || 'Book');
  const cleanAuthor = encodeURIComponent(author?.trim() || '');
  
  // 1. If we have an ISBN, use Amazon's cover API (what many book sites use)
  if (cleanIsbn && cleanIsbn.length >= 10) {
    // Add a timestamp to prevent caching issues
    const timestamp = Date.now();
    
    // First choice: Amazon's image service (what Z-Library likely uses)
    // This is one of the most reliable book cover APIs
    return `https://images-na.ssl-images-amazon.com/images/P/${cleanIsbn}.01._SX450_SY635_SCLZZZZZZZ_.jpg?t=${timestamp}`;
  }
  
  // 2. If no ISBN but we have a title, try Google Books
  if (title) {
    // Format search query for Google Books
    const query = cleanTitle + (cleanAuthor ? `+inauthor:${cleanAuthor}` : '');
    
    // Google Books (used by many modern book sites)
    // This dynamically searches by title and author
    return `https://books.google.com/books/content?id=_&printsec=frontcover&img=1&zoom=1&source=gbs_api&q=${query}`;
  }
  
  // 3. Last resort - generate a nice placeholder using format and title
  const colors = {
    'E-book': ['375986', '1a4c7e', '2c4c6b'],
    'Audiobook': ['693b26', '8f5a38', '7b3294']
  };
  
  // Create a stable hash from the title to ensure consistency
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorSet = colors[format as keyof typeof colors] || colors['E-book'];
  const colorIndex = Math.abs(hash) % colorSet.length;
  const color = colorSet[colorIndex];
  
  // Shorten title for placeholder and ensure it's readable
  const shortTitle = title.length > 12 ? title.substring(0, 12) + '...' : title;
  const placeholderText = encodeURIComponent(shortTitle || format);
  
  // Return a nice placeholder with consistent color based on title
  return `https://via.placeholder.com/200x300/${color}/FFFFFF?text=${placeholderText}`;
};

// Main component
const BookRequestPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // requests list
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // modal state
  const [showModal, setShowModal] = useState(false);
  const [modalIsbn, setModalIsbn] = useState('');
  const [modalFormat, setModalFormat] = useState<'E-book'|'Audiobook'>('E-book');
  const [modalNotes, setModalNotes] = useState('');
  const [modalMeta, setModalMeta] = useState({ 
    title:'', 
    author:'', 
    cover_url:'',
    publisher:'',
    published_year:'',
    language:'',
    description:''
  });
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalLanguage, setModalLanguage] = useState<string>('German');
  const [modalYear, setModalYear] = useState<string>('');
  const [viewScope, setViewScope] = useState<'all'|'mine'>('all');
  
  const { remainingRequests, totalQuota, loading: quotaLoading } = useBookRequestQuota();
  
  useEffect(() => {
    if (user) {
      fetchBookRequests();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Real-time subscriptions: update list on changes
  useEffect(() => {
    if (!user) return;
    console.log("Setting up real-time subscription for book requests");
    
    const subscription = supabase
      .channel('user-requests-ch')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'book_requests' }, 
        (payload) => {
          console.log("Real-time update received:", payload);
          // Refresh the data when changes occur
          fetchBookRequests();
        }
      )
      .subscribe();

    // Test the connection
    console.log("Subscription active:", subscription.state);

    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(subscription);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const subscription = supabase
      .channel('user-requests-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_votes' }, () => {
        fetchBookRequests();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);
  
  // fetch book requests from supabase
  const fetchBookRequests = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching book requests...");
      
      if (!user) {
        console.log("No user logged in, skipping fetch");
        return;
      }
      
      // Get all book requests with votes
      const { data, error: fetchError } = await supabase
        .from('book_requests')
        .select('*, request_votes(vote, user_id)')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error("Error fetching book requests:", fetchError);
        throw new Error(fetchError.message);
      }
      
      console.log(`Retrieved ${data?.length || 0} book requests`);
      
      const mappedRequests = (data || []).map(request => {
        const voteSum = request.request_votes?.reduce((sum: number, v: RequestVote) => sum + v.vote, 0) || 0;
        const myVoteObj = request.request_votes?.find((v: RequestVote) => v.user_id === user.id);
        
        // Use our multi-source cover API with proper fallbacks
        // Use ISBN if available, otherwise use title and author
        const isbn = request.description?.match(/ISBN[:\s]*([0-9X-]+)/i)?.[1] || '';
        const coverUrl = request.cover_url || getBookCover(isbn, request.title, request.author || '', request.format);
        
        // Extract additional metadata from description if it exists
        // This helps with displaying older requests that might not have the new fields
        let publisher = request.publisher || '';
        let publishedYear = request.published_year || '';
        
        // Extract year from description if not available directly
        if (!publishedYear && request.description) {
          const yearMatch = request.description.match(/Year:\s*(\d{4})/i);
          if (yearMatch) publishedYear = yearMatch[1];
        }
        
        return {
          ...request,
          voteSum,
          myVote: myVoteObj?.vote ?? 0,
          status: request.status === 'pending' ? 'Pending' :
                  request.status === 'fulfilled' ? 'Fulfilled' :
                  request.status === 'rejected' ? 'Declined' :
                  'Pending',
          cover_url: coverUrl,
          publisher,
          published_year: publishedYear
        };
      });
      
      setRequests(mappedRequests);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voting (upvote=1, downvote=-1)
  const handleVote = async (requestId: string, value: 1 | -1) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    const newVote = req.myVote === value ? 0 : value; // toggle
    try {
      await supabase.from('request_votes').upsert([
        { request_id: requestId, user_id: user!.id, vote: newVote }
      ], { onConflict: 'request_id,user_id' });
      // optimistic update
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, myVote: newVote, voteSum: r.voteSum - req.myVote + newVote } : r));
    } catch (e) {
      console.error('Vote error', e);
    }
  };

  // Simplified metadata fetch with GUARANTEED working covers
  const fetchMetadata = async (isbn: string) => {
    setModalError(null);
    const cleanIsbn = isbn.trim();
    if (!cleanIsbn) {
      setModalError('Please enter a valid ISBN.');
      return;
    }
    setIsModalLoading(true);
    console.log("Fetching metadata for ISBN:", cleanIsbn);
    try {
      // reset preview
      setModalMeta({ 
        title: '', 
        author: '', 
        cover_url: '',
        publisher: '',
        published_year: '',
        language: '',
        description: ''
      });
      
      // fetch from Google Books with full response
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
      const data = await res.json();
      console.log("Google Books API response:", data);
      
      const info = data.items?.[0]?.volumeInfo;
      if (!info || !info.title) {
        setModalError('No metadata found for this ISBN.');
        return;
      }
      
      const title = info.title ?? '';
      const authors = info.authors ?? [];
      const publisher = info.publisher ?? '';
      const publishedYear = info.publishedDate ? info.publishedDate.substring(0, 4) : '';
      const language = info.language ?? '';
      const description = info.description ?? '';
      
      // Extract all available metadata
      console.log("Google Books metadata:", info);
      
      // Always use our GUARANTEED working cover system
      const coverUrl = getBookCover(cleanIsbn, title, authors.join(', '), modalFormat);
      
      console.log("Setting cover URL to:", coverUrl);
      
      // Set metadata with ALL available fields
      setModalMeta({ 
        title, 
        author: authors.join(', '), 
        cover_url: coverUrl,
        publisher,
        published_year: publishedYear,
        language,
        description
      });
    } catch (e) {
      console.error('Metadata fetch error', e);
      setModalError('Error fetching metadata.');
      
      // Even on error, ensure we have a placeholder
      if (modalIsbn) {
        // Try to set a basic placeholder with the ISBN
        const fallbackUrl = getBookCover(cleanIsbn, "Book", "", modalFormat);
        setModalMeta(prev => ({
          ...prev,
          cover_url: fallbackUrl
        }));
      }
    } finally {
      setIsModalLoading(false);
    }
  };

  // handle modal submission
  const handleModalSubmit = async () => {
    if (!user) {
      setModalError("You must be logged in to submit a request.");
      return;
    }

    setModalError(null);
    setIsModalLoading(true);
    console.log("Starting book request submission...");

    try {
      // Ensure we have metadata
      if (!modalMeta.title || !modalMeta.cover_url) {
        console.log("Metadata missing, attempting to fetch it first...");
        await fetchMetadata(modalIsbn);
      }

      // Verify we have required fields
      if (!modalMeta.title) {
        throw new Error("Book title is required");
      }

      // Create a more comprehensive description that includes metadata
      let fullDescription = '';
      
      if (modalNotes) {
        fullDescription += modalNotes;
      }
      
      // Add year if provided
      if (modalYear) {
        fullDescription += (fullDescription ? ' | ' : '') + `Year: ${modalYear}`;
      }
      
      // Add publisher if available (since we don't have a publisher column)
      if (modalMeta.publisher) {
        fullDescription += (fullDescription ? ' | ' : '') + `Publisher: ${modalMeta.publisher}`;
      }
      
      // Add published year if available
      if (modalMeta.published_year) {
        fullDescription += (fullDescription ? ' | ' : '') + `Published: ${modalMeta.published_year}`;
      }
      
      // Store ISBN if we have it
      if (modalIsbn) {
        fullDescription += (fullDescription ? ' | ' : '') + `ISBN: ${modalIsbn}`;
      }
      
      // Get a guaranteed working cover
      const finalCoverUrl = getBookCover(modalIsbn, modalMeta.title, modalMeta.author, modalFormat);
      
      console.log("Preparing to insert request with data:", {
        title: modalMeta.title,
        author: modalMeta.author,
        format: modalFormat,
        language: modalLanguage || modalMeta.language
      });
      
      // Create the request object with ALL fields including the new database columns
      const newRequest = { 
        user_id: user.id, // Make sure user ID is included
        title: modalMeta.title,
        author: modalMeta.author || null,
        language: modalLanguage || modalMeta.language || 'German',
        format: modalFormat,
        description: modalNotes || null, // Just use notes for description now
        publisher: modalMeta.publisher || null, // Use the actual column
        published_year: modalMeta.published_year || modalYear || null, // Use the actual column
        priority: 'Medium',
        status: 'pending',
        cover_url: finalCoverUrl
      };
      
      console.log("Inserting new book request:", newRequest);
      
      // Insert the request
      const { data, error } = await supabase
        .from('book_requests')
        .insert([newRequest]);
      
      // Check for errors
      if (error) {
        console.error('Insert error from Supabase:', error);
        throw new Error(error.message || "Failed to submit request");
      }
      
      console.log("Book request inserted successfully!", data);
      
      // Immediately update local state to show the new request
      // This is a fallback in case the subscription doesn't trigger
      // Rather than trying to create a new mapped request with the wrong type,
      // just call fetchBookRequests to refresh data properly
      fetchBookRequests();
      
      
      // Reset the form
      setIsModalLoading(false);
      setShowModal(false);
      setModalIsbn(''); 
      setModalNotes(''); 
      setModalFormat('E-book'); 
      setModalMeta({
        title: '',
        author: '',
        cover_url: '',
        publisher: '',
        published_year: '',
        language: '',
        description: ''
      });
      
      // Refresh the list to show the new request
      fetchBookRequests();
      setSuccessMessage('Request submitted successfully!');
    } catch (error: any) {
      console.error('Book request submission error:', error);
      setModalError(error.message || "Failed to submit request");
      setIsModalLoading(false);
    }
  };

  const [filter, setFilter] = useState<'all'|'active'|'completed'|'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // scope & counts
  const scopedRequests = viewScope === 'all' ? requests : requests.filter(r => r.user_id === user?.id);
  const totalRequests = scopedRequests.length;
  const activeCount = scopedRequests.filter(r => ['Pending'].includes(r.status)).length;
  const completedCount = scopedRequests.filter(r => r.status === 'Fulfilled').length;
  const expiredCount = scopedRequests.filter(r => r.status === 'Declined').length;
  const filteredRequests = scopedRequests.filter(r => {
    const s = searchTerm.trim().toLowerCase();
    const matchesSearch = !s || r.title.toLowerCase().includes(s) || (r.author?.toLowerCase() ?? '').includes(s);
    let matchesStatus = false;
    if (filter === 'all') matchesStatus = true;
    else if (filter === 'active') matchesStatus = ['Pending'].includes(r.status);
    else if (filter === 'completed') matchesStatus = r.status === 'Fulfilled';
    else if (filter === 'expired') matchesStatus = r.status === 'Declined';
    return matchesSearch && matchesStatus;
  });

  // sort: pending by votes desc, others by date desc
  const sortedRequests = [...filteredRequests].sort((a,b) => {
    if (a.status === 'Pending' && b.status === 'Pending') return b.voteSum - a.voteSum;
    if (a.status === 'Pending') return -1;
    if (b.status === 'Pending') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (!user) return null;

  return (
    <AdminContainer>
      <PageHeader>
        <PageTitle>Book Requests</PageTitle>
        <Subtitle>Manage and track your requests below.</Subtitle>
      </PageHeader>
      {successMessage && <p style={{ color: 'green', margin: '0.5rem 0' }}>{successMessage}</p>}
      {!quotaLoading && (() => {
        const rem = remainingRequests ?? 0;
        return rem <= 0
          ? <p style={{ color: 'red', margin: '0.5rem 0' }}>Monthly limit reached.</p>
          : <p style={{ color: '#555', margin: '0.5rem 0' }}>Remaining requests: {rem} of {totalQuota}.</p>;
      })()}
      <Tabs style={{ marginBottom: '1rem' }}>
        <Tab active={viewScope==='all'} onClick={() => setViewScope('all')}>All Requests</Tab>
        <Tab active={viewScope==='mine'} onClick={() => setViewScope('mine')}>My Requests</Tab>
      </Tabs>
      <Card>
        <ActionButton
          onClick={() => setShowModal(true)}
          disabled={(remainingRequests ?? 0) <= 0}
        ><FiPlus /> Request Book</ActionButton>
        <FormGroup style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Input
            type="search"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
          />
        </FormGroup>
        <Tabs>
          <Tab active={filter === 'all'} onClick={() => setFilter('all')}><FiList /> All ({totalRequests})</Tab>
          <Tab active={filter === 'active'} onClick={() => setFilter('active')}><FiClock /> Active ({activeCount})</Tab>
          <Tab active={filter === 'completed'} onClick={() => setFilter('completed')}><FiCheckCircle /> Completed ({completedCount})</Tab>
          <Tab active={filter === 'expired'} onClick={() => setFilter('expired')}><FiXCircle /> Expire ({expiredCount})</Tab>
        </Tabs>
        <RequestListContainer>
          {isLoading ? (
            <LoadingState><LoadingSpinner><FiLoader size={24}/></LoadingSpinner>Loading...</LoadingState>
          ) : sortedRequests.length === 0 ? (
            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
              <FiList size={48}/>
              <p>No requests found.</p>
            </div>
          ) : (
            sortedRequests.map(request => {
              // Use the cover_url directly from the request - it's already processed
              // during the mapping phase and will have a real cover or appropriate placeholder
              const imgSrc = request.cover_url;
              return (
                <RequestListItem key={request.id}>
                  <VoteContainer>
                    <button className={request.myVote===1 ? 'active':''} onClick={() => handleVote(request.id,1)} title="Upvote"><FiThumbsUp/></button>
                    <span style={{ fontSize:'0.8rem', fontWeight:'bold' }}>{request.voteSum}</span>
                    <button className={request.myVote===-1 ? 'active':''} onClick={() => handleVote(request.id,-1)} title="Downvote"><FiThumbsDown/></button>
                  </VoteContainer>
                  {/* If the book is fulfilled and has a book_link, make the cover clickable */}
                  {(request.status.toLowerCase() === 'fulfilled') && request.book_link ? (
                    <a href={request.book_link} target="_blank" rel="noopener noreferrer" title="Access this book">
                      <RequestCover
                        src={imgSrc}
                        alt={request.title}
                        width="60"
                        height="90"
                        onError={e => { 
                          console.log(`Cover for "${request.title}" failed to load, using fallback`);
                          (e.currentTarget as HTMLImageElement).src = getBookCover('', request.title, request.author || '', request.format);
                          (e.currentTarget as HTMLImageElement).onerror = null; // Prevent infinite error loop
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </a>
                  ) : (
                    <RequestCover
                      src={imgSrc}
                      alt={request.title}
                      width="60"
                      height="90"
                      onError={e => { 
                        console.log(`Cover for "${request.title}" failed to load, using fallback`);
                        (e.currentTarget as HTMLImageElement).src = getBookCover('', request.title, request.author || '', request.format);
                        (e.currentTarget as HTMLImageElement).onerror = null; // Prevent infinite error loop
                      }}
                    />
                  )}
                  <RequestInfo>
                    {/* If the book is fulfilled and has a book_link, make the title clickable */}
                    <RequestTitleStyled>
                      {(request.status.toLowerCase() === 'fulfilled') && request.book_link ? (
                        <a 
                          href={request.book_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          <span style={{ textDecoration: 'underline' }}>{request.title}</span>
                          <span style={{ marginLeft: '5px', fontSize: '0.8rem', color: '#38a169' }}>
                            <FiExternalLink />
                          </span>
                        </a>
                      ) : (
                        <span>{request.title}</span>
                      )}
                      <RequestAccessBadge status={request.status}>{request.status}</RequestAccessBadge>
                    </RequestTitleStyled>
                    <RequestMeta>
                      <span>{request.author||'-'}</span><span>•</span><span>{request.format}</span><span>•</span><span>{request.language || 'Unknown Language'}</span>
                    </RequestMeta>
                    <RequestMeta style={{ fontSize: '0.75em', color: '#666' }}>
                      {request.publisher && <span>{request.publisher}</span>}
                      {request.published_year && <span>• {request.published_year}</span>}
                      <span>• {new Date(request.created_at).toLocaleDateString()}</span>
                    </RequestMeta>
                    {request.description && (
                      <div style={{ fontSize: '0.8em', marginTop: '0.5rem', color: '#555', maxHeight: '3em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {request.description}
                      </div>
                    )}
                  </RequestInfo>
                </RequestListItem>
              );
            })
          )}
        </RequestListContainer>

        {showModal && createPortal(
          <ModalOverlay onClick={() => setShowModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                {modalError && <p style={{ color: 'red', margin: 0 }}>{modalError}</p>}
                <h2>Request a Book</h2>
              </ModalHeader>
              <ModalBody>
                <FormGroup>
                  <Label>ISBN</Label>
                  <Input value={modalIsbn} onChange={e => setModalIsbn(e.target.value)} placeholder="ISBN-10 or ISBN-13" />
                  <ActionButton type="button" onClick={() => fetchMetadata(modalIsbn)} disabled={isModalLoading || !modalIsbn.trim()}>
                    {isModalLoading ? <><FiLoader /> Loading...</> : 'Fetch Metadata'}
                  </ActionButton>
                </FormGroup>
                <FormGroup>
                  <Label>Type</Label>
                  <Select value={modalFormat} onChange={e => setModalFormat(e.target.value as any)}>
                    <option value="E-book">E-book</option>
                    <option value="Audiobook">Audiobook</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Notes</Label>
                  <Textarea value={modalNotes} onChange={e => setModalNotes(e.target.value)} placeholder="Notes (optional)" />
                </FormGroup>
                {modalMeta.title ? (
                  <PreviewContainer>
                    <img 
                      src={modalMeta.cover_url || getBookCover(modalIsbn, modalMeta.title || 'Book', modalMeta.author || '', modalFormat)} 
                      alt={modalMeta.title}
                      width="120"
                      height="180"
                      onError={(e) => {
                        console.log("Modal preview image failed to load, using placeholder");
                        e.currentTarget.src = getBookCover('', modalMeta.title || 'Book', modalMeta.author || '', modalFormat);
                      }}
                      style={{ objectFit: 'cover', border: '1px solid #ccc' }}
                    />
                    <div>
                      <h3>{modalMeta.title}</h3>
                      <p><strong>Author:</strong> {modalMeta.author || 'Unknown'}</p>
                      {modalMeta.publisher && <p><strong>Publisher:</strong> {modalMeta.publisher}</p>}
                      {modalMeta.published_year && <p><strong>Year:</strong> {modalMeta.published_year}</p>}
                      {modalMeta.language && <p><strong>Language:</strong> {modalMeta.language.toUpperCase()}</p>}
                      {modalMeta.description && (
                        <div>
                          <p><strong>Description:</strong></p> 
                          <p style={{ fontSize: '0.9em', maxHeight: '100px', overflowY: 'auto' }}>
                            {modalMeta.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </PreviewContainer>
                ) : modalError && (
                  <>
                    <FormGroup>
                      <Label>Title</Label>
                      <Input value={modalMeta.title} onChange={e => setModalMeta(prev => ({ ...prev, title: e.target.value }))} />
                    </FormGroup>
                    <FormGroup>
                      <Label>Authors</Label>
                      <Input value={modalMeta.author} onChange={e => setModalMeta(prev => ({ ...prev, author: e.target.value }))} />
                    </FormGroup>
                    <FormGroup>
                      <Label>Publication Year</Label>
                      <Input value={modalYear} onChange={e => setModalYear(e.target.value)} placeholder="YYYY" />
                    </FormGroup>
                    <FormGroup>
                      <Label>Language</Label>
                      <Input value={modalLanguage} onChange={e => setModalLanguage(e.target.value)} />
                    </FormGroup>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <ActionButton type="button" onClick={handleModalSubmit} disabled={isModalLoading || !modalMeta.title}>Submit Request</ActionButton>
                <ActionButton type="button" className="secondary" onClick={() => setShowModal(false)}>Cancel</ActionButton>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>,
          document.body
        )}
      </Card>
    </AdminContainer>
  );
};

export default BookRequestPage;
