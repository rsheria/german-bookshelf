import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiCheckCircle, FiAlertCircle, FiX, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

// Styled components for the page
const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #7f8c8d;
  margin-top: 0;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid #eee;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 1rem;
  background-color: ${({ active }) => (active ? '#3498db' : 'transparent')};
  color: ${({ active }) => (active ? 'white' : '#333')};
  border: none;
  cursor: pointer;
  font-weight: ${({ active }) => (active ? 'bold' : 'normal')};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ active }) => (active ? '#3498db' : '#f5f5f5')};
  }
`;

const FormContainer = styled.div`
  padding: 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
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
  
  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const RequestList = styled.div`
  padding: 1.5rem;
`;

const RequestItem = styled.div`
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const RequestHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const RequestTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
`;

const RequestStatus = styled.span<{ status: string }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  background-color: ${({ status }) => {
    switch (status) {
      case 'Approved': return '#27ae60';
      case 'Pending': return '#f39c12';
      case 'Fulfilled': return '#3498db';
      case 'Declined': return '#e74c3c';
      default: return '#95a5a6';
    }
  }};
  color: white;
`;

const RequestInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const InfoItem = styled.div`
  margin-bottom: 0.5rem;
`;

const InfoLabel = styled.span`
  font-size: 0.8rem;
  color: #7f8c8d;
  display: block;
`;

const InfoValue = styled.span`
  font-weight: 500;
  color: #2c3e50;
`;

const RequestDescription = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

const AdminNotes = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  background-color: #f9f9f9;
  padding: 1rem;
  border-radius: 4px;
`;

const AdminNotesLabel = styled.span`
  font-size: 0.8rem;
  color: #7f8c8d;
  display: block;
  margin-bottom: 0.5rem;
`;

const Alert = styled.div<{ type: 'error' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${({ type }) => (type === 'error' ? '#f8d7da' : '#d4edda')};
  color: ${({ type }) => (type === 'error' ? '#721c24' : '#155724')};
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  background-color: #f8f9fa;
  border-radius: 4px;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  
  &:hover {
    background-color: #fee;
  }
  
  &:disabled {
    color: #95a5a6;
    cursor: not-allowed;
  }
`;

const QuotaInfo = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const QuotaText = styled.div`
  color: #34495e;
`;

const QuotaBar = styled.div`
  width: 100%;
  max-width: 150px;
  height: 10px;
  background-color: #ecf0f1;
  border-radius: 5px;
  overflow: hidden;
  margin-left: 1rem;
`;

const QuotaProgress = styled.div<{ percentage: number; status: 'good' | 'medium' | 'critical' }>`
  height: 100%;
  width: ${({ percentage }) => `${percentage}%`};
  background-color: ${({ status }) => {
    switch (status) {
      case 'good': return '#2ecc71';
      case 'medium': return '#f39c12';
      case 'critical': return '#e74c3c';
      default: return '#2ecc71';
    }
  }};
  transition: width 0.3s ease;
`;

// Interface for book request
interface BookRequest {
  id: string;
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
}

// Interface for form data
interface FormData {
  title: string;
  author: string;
  language: string;
  format: string;
  description: string;
  priority: string;
}

// Main component
const BookRequestPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [isShowingForm, setIsShowingForm] = useState(() => {
    // Try to restore the last active tab from localStorage
    const savedTab = localStorage.getItem('bookRequestTab');
    return savedTab ? savedTab === 'form' : true;
  });
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{used: number, max: number, remaining: number, canRequest: boolean} | null>(null);
  
  // Initialize form data
  const [formData, setFormData] = useState<FormData>({
    title: '',
    author: '',
    language: 'German',
    format: 'Book',
    description: '',
    priority: 'Medium'
  });
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);
  
  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bookRequestTab', isShowingForm ? 'form' : 'requests');
  }, [isShowingForm]);
  
  // Fetch user's book requests
  useEffect(() => {
    const fetchBookRequests = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Fetching book requests for user", user.id);
        
        // First try with RLS-enabled table
        const { data, error } = await supabase
          .from('book_requests')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Error fetching from book_requests:", error);
          throw error;
        }
        
        if (data) {
          console.log(`Found ${data.length} book requests`);
          setRequests(data);
        } else {
          console.log("No book requests found - data is null");
          setRequests([]);
        }
        
        // Fetch the user's monthly quota info
        const { data: quotaData, error: quotaError } = await supabase
          .rpc('get_user_request_quota', { user_id: user.id });
          
        if (quotaError) {
          console.error('Error fetching quota:', quotaError);
        } else {
          console.log("Quota info:", quotaData);
          setQuotaInfo(quotaData);
        }
      } catch (err) {
        console.error('Error fetching book requests:', err);
        
        // Fallback attempt - get from admin view
        try {
          console.log("Attempting fallback using admin_book_requests view");
          const { data: adminData, error: adminError } = await supabase
            .from('admin_book_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (adminError) {
            console.error("Admin fallback failed:", adminError);
            setError(t('bookRequest.errorFetchingRequests', 'Failed to load your book requests. Please try again later.'));
          } else if (adminData) {
            console.log(`Found ${adminData.length} book requests via admin view`);
            setRequests(adminData);
          }
        } catch (fallbackErr) {
          console.error("Fallback attempt failed:", fallbackErr);
          setError(t('bookRequest.errorFetchingRequests', 'Failed to load your book requests. Please try again later.'));
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookRequests();
    
    // Set up a refetch interval to handle stale data
    const intervalId = setInterval(() => {
      if (user && !isShowingForm) {
        console.log("Refreshing book requests data...");
        fetchBookRequests();
      }
    }, 30000); // Refresh every 30 seconds when on the requests tab
    
    return () => clearInterval(intervalId);
  }, [user, t, isShowingForm]);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle deleting a request
  const handleDeleteRequest = async (id: string) => {
    if (!user || !window.confirm(t('bookRequest.confirmDelete', 'Are you sure you want to delete this request?'))) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('book_requests')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      // Update the requests list
      setRequests(prev => prev.filter(request => request.id !== id));
      
      // Update quota info after deletion
      const { data: quotaData, error: quotaError } = await supabase
        .rpc('get_user_request_quota', { user_id: user.id });
        
      if (!quotaError) {
        setQuotaInfo(quotaData);
      }
      
      setSuccess(t('bookRequest.requestDeleted', 'Book request deleted successfully.'));
    } catch (err) {
      console.error('Error deleting book request:', err);
      setError(t('bookRequest.errorDeleting', 'Failed to delete book request. Please try again later.'));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError(t('bookRequest.errorNotLoggedIn', 'You must be logged in to request books.'));
      return;
    }
    
    // Check if user has hit their monthly quota limit
    if (quotaInfo && !quotaInfo.canRequest) {
      setError(t('bookRequest.errorQuotaReached', 'You have reached your monthly request limit. Please try again next month.'));
      return;
    }
    
    // Validate form
    if (!formData.title.trim()) {
      setError(t('bookRequest.errorTitle', 'Title is required'));
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Use the create_book_request RPC function to handle quota limits at the database level
      const { error } = await supabase
        .rpc('create_book_request', {
          p_title: formData.title.trim(),
          p_author: formData.author.trim() || null,
          p_language: formData.language,
          p_format: formData.format,
          p_description: formData.description.trim() || null,
          p_priority: formData.priority
        });
      
      if (error) {
        throw error;
      }
      
      // Refresh the book requests list and quota info
      const { data: updatedData, error: fetchError } = await supabase
        .from('book_requests')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (fetchError) {
        console.error('Error refreshing book requests:', fetchError);
      } else {
        setRequests(updatedData || []);
      }
      
      // Refresh quota information
      const { data: quotaData, error: quotaError } = await supabase
        .rpc('get_user_request_quota', { user_id: user.id });
        
      if (!quotaError) {
        setQuotaInfo(quotaData);
      }
      
      // Show success message
      setSuccess(t('bookRequest.requestSubmitted', 'Your book request has been submitted successfully.'));
      
      // Reset the form
      setFormData({
        title: '',
        author: '',
        language: 'German',
        format: 'Book',
        description: '',
        priority: 'Medium'
      });
      
      // Switch to requests tab
      setIsShowingForm(false);
    } catch (err) {
      console.error('Error submitting book request:', err);
      setError(t('bookRequest.errorSubmitting', 'Failed to submit your book request. Please try again later.'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // If still checking authentication, show loading
  if (authLoading) {
    return (
      <Container>
        <LoadingSpinner>
          <FiLoader size={24} />
        </LoadingSpinner>
        {t('common.loading', 'Loading...')}
      </Container>
    );
  }
  
  return (
    <Container>
      <Header>
        <Title>{t('bookRequest.title', 'Book Requests')}</Title>
        <Subtitle>
          {t('bookRequest.subtitle', 'Request books that you would like to see added to our collection')}
        </Subtitle>
      </Header>
      
      {error && (
        <Alert type="error">
          <FiAlertCircle />
          {error}
          <CloseButton onClick={() => setError(null)}>
            <FiX />
          </CloseButton>
        </Alert>
      )}
      
      {success && (
        <Alert type="success">
          <FiCheckCircle />
          {success}
          <CloseButton onClick={() => setSuccess(null)}>
            <FiX />
          </CloseButton>
        </Alert>
      )}
      
      {quotaInfo && (
        <QuotaInfo>
          <QuotaText>
            {t('bookRequest.quota', 'Monthly Quota:')} {quotaInfo.used}/{quotaInfo.max}
          </QuotaText>
          <QuotaBar>
            <QuotaProgress 
              percentage={(quotaInfo.used / quotaInfo.max) * 100} 
              status={quotaInfo.canRequest ? 'good' : quotaInfo.remaining > 0 ? 'medium' : 'critical'}
            />
          </QuotaBar>
        </QuotaInfo>
      )}
      
      <Card>
        <Tabs>
          <Tab 
            active={isShowingForm} 
            onClick={() => setIsShowingForm(true)}
          >
            {t('bookRequest.newRequest', 'New Request')}
          </Tab>
          <Tab 
            active={!isShowingForm} 
            onClick={() => setIsShowingForm(false)}
          >
            {t('bookRequest.yourRequests', 'Your Requests')} ({requests.length})
          </Tab>
        </Tabs>
        
        {isShowingForm ? (
          <FormContainer>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="title">{t('bookRequest.bookTitle', 'Book Title')} *</Label>
                <Input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="author">{t('bookRequest.author', 'Author')}</Label>
                <Input
                  type="text"
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="language">{t('bookRequest.language', 'Language')}</Label>
                <Select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                >
                  <option value="German">German</option>
                  <option value="English">English</option>
                  <option value="Other">Other</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="format">{t('bookRequest.format', 'Format')}</Label>
                <Select
                  id="format"
                  name="format"
                  value={formData.format}
                  onChange={handleChange}
                >
                  <option value="Book">Book</option>
                  <option value="Audiobook">Audiobook</option>
                  <option value="E-book">E-book</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="description">{t('bookRequest.description', 'Description / Notes')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('bookRequest.descriptionPlaceholder', 'Any additional information about the book or specific edition')}
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="priority">{t('bookRequest.priority', 'Priority')}</Label>
                <Select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </Select>
              </FormGroup>
              
              <SubmitButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner>
                      <FiLoader size={18} />
                    </LoadingSpinner>
                    {t('common.submitting', 'Submitting...')}
                  </>
                ) : (
                  t('bookRequest.submitRequest', 'Submit Request')
                )}
              </SubmitButton>
            </form>
          </FormContainer>
        ) : (
          <RequestList>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <LoadingSpinner>
                  <FiLoader size={24} />
                </LoadingSpinner>
                {t('common.loading', 'Loading...')}
              </div>
            ) : requests.length === 0 ? (
              <EmptyState>
                {t('bookRequest.noRequests', 'You have not made any book requests yet.')}
              </EmptyState>
            ) : (
              requests.map(request => (
                <RequestItem key={request.id}>
                  <RequestHeader>
                    <RequestTitle>{request.title}</RequestTitle>
                    <RequestStatus status={request.status}>
                      {t(`bookRequest.status.${request.status.toLowerCase()}`, request.status)}
                    </RequestStatus>
                  </RequestHeader>
                  
                  <RequestInfo>
                    <InfoItem>
                      <InfoLabel>{t('bookRequest.author', 'Author')}</InfoLabel>
                      <InfoValue>{request.author || '-'}</InfoValue>
                    </InfoItem>
                    
                    <InfoItem>
                      <InfoLabel>{t('bookRequest.format', 'Format')}</InfoLabel>
                      <InfoValue>{request.format}</InfoValue>
                    </InfoItem>
                    
                    <InfoItem>
                      <InfoLabel>{t('bookRequest.language', 'Language')}</InfoLabel>
                      <InfoValue>{request.language}</InfoValue>
                    </InfoItem>
                    
                    <InfoItem>
                      <InfoLabel>{t('bookRequest.priority', 'Priority')}</InfoLabel>
                      <InfoValue>{request.priority}</InfoValue>
                    </InfoItem>
                    
                    <InfoItem>
                      <InfoLabel>{t('bookRequest.requestedOn', 'Requested On')}</InfoLabel>
                      <InfoValue>{formatDate(request.created_at)}</InfoValue>
                    </InfoItem>
                    
                    {request.fulfilled_at && (
                      <InfoItem>
                        <InfoLabel>{t('bookRequest.fulfilledOn', 'Fulfilled On')}</InfoLabel>
                        <InfoValue>{formatDate(request.fulfilled_at)}</InfoValue>
                      </InfoItem>
                    )}
                  </RequestInfo>
                  
                  {request.description && (
                    <RequestDescription>
                      <InfoLabel>{t('bookRequest.description', 'Description / Notes')}</InfoLabel>
                      <p>{request.description}</p>
                    </RequestDescription>
                  )}
                  
                  {request.admin_notes && (
                    <AdminNotes>
                      <AdminNotesLabel>{t('bookRequest.adminNotes', 'Admin Notes')}</AdminNotesLabel>
                      <p>{request.admin_notes}</p>
                    </AdminNotes>
                  )}
                  
                  {request.status === 'Pending' && (
                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                      <DeleteButton onClick={() => handleDeleteRequest(request.id)}>
                        {t('common.delete', 'Delete')}
                      </DeleteButton>
                    </div>
                  )}
                </RequestItem>
              ))
            )}
          </RequestList>
        )}
      </Card>
    </Container>
  );
};

export default BookRequestPage;
