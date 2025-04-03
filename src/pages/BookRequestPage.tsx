import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { 
  FiBookOpen, 
  FiSend, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiClock
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

// Styled components
const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
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
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: #3498db;
    outline: none;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 100px;
  resize: vertical;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: #3498db;
    outline: none;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: #3498db;
    outline: none;
  }
`;

const Button = styled.button`
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #2980b9;
  }
  
  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const RequestsList = styled.div`
  margin-top: 2rem;
`;

const RequestCard = styled.div<{ status: string }>`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.25rem;
  margin-bottom: 1rem;
  border-left: 4px solid ${({ status }) => {
    switch (status) {
      case 'Pending': return '#f39c12';
      case 'Approved': return '#3498db';
      case 'Fulfilled': return '#2ecc71';
      case 'Rejected': return '#e74c3c';
      default: return '#95a5a6';
    }
  }};
`;

const RequestTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: #2c3e50;
`;

const RequestDetails = styled.div`
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.75rem;
`;

const RequestMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #7f8c8d;
`;

const RequestStatus = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
  color: ${({ status }) => {
    switch (status) {
      case 'Pending': return '#f39c12';
      case 'Approved': return '#3498db';
      case 'Fulfilled': return '#2ecc71';
      case 'Rejected': return '#e74c3c';
      default: return '#95a5a6';
    }
  }};
`;

const Alert = styled.div<{ type: 'error' | 'success' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${({ type }) => {
    switch (type) {
      case 'error': return '#f8d7da';
      case 'success': return '#d4edda';
      case 'info': return '#d1ecf1';
      default: return '#f8d7da';
    }
  }};
  color: ${({ type }) => {
    switch (type) {
      case 'error': return '#721c24';
      case 'success': return '#155724';
      case 'info': return '#0c5460';
      default: return '#721c24';
    }
  }};
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
`;

const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid #e1e1e1;
  margin-bottom: 1.5rem;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 0.75rem 1.25rem;
  background: ${({ active }) => active ? 'white' : 'transparent'};
  border: none;
  border-bottom: ${({ active }) => active ? '2px solid #3498db' : 'none'};
  color: ${({ active }) => active ? '#3498db' : '#7f8c8d'};
  font-weight: ${({ active }) => active ? '500' : 'normal'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    color: #3498db;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
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

// Interface for book request
interface BookRequest {
  id: string;
  title: string;
  author: string | null;
  language: string;
  format: 'Book' | 'Audiobook' | 'Either';
  description: string | null;
  priority: 'Low' | 'Medium' | 'High' | null;
  status: 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected';
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
}

// Form data interface
interface FormData {
  title: string;
  author: string;
  language: string;
  format: 'Book' | 'Audiobook' | 'Either';
  description: string;
  priority: 'Low' | 'Medium' | 'High';
}

const BookRequestPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'form' | 'requests'>('form');
  const [formData, setFormData] = useState<FormData>({
    title: '',
    author: '',
    language: 'German',
    format: 'Book',
    description: '',
    priority: 'Medium'
  });
  
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);
  
  // Fetch user's book requests
  useEffect(() => {
    const fetchBookRequests = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('book_requests')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setRequests(data || []);
      } catch (err) {
        console.error('Error fetching book requests:', err);
        setError('Failed to load your book requests. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookRequests();
  }, [user]);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validate form
    if (!formData.title.trim()) {
      setError('Please enter a book title.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('book_requests')
        .insert([
          {
            user_id: user.id,
            title: formData.title.trim(),
            author: formData.author.trim() || null,
            language: formData.language,
            format: formData.format,
            description: formData.description.trim() || null,
            priority: formData.priority,
            status: 'Pending'
          }
        ])
        .select();
        
      if (error) {
        throw error;
      }
      
      // Add the new request to the list
      if (data && data.length > 0) {
        setRequests(prev => [data[0], ...prev]);
      }
      
      // Show success message
      setSuccess('Your book request has been submitted successfully!');
      
      // Reset form
      setFormData({
        title: '',
        author: '',
        language: 'German',
        format: 'Book',
        description: '',
        priority: 'Medium'
      });
      
      // Switch to requests tab
      setActiveTab('requests');
    } catch (err) {
      console.error('Error submitting book request:', err);
      setError('Failed to submit your book request. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle request deletion
  const handleDeleteRequest = async (id: string) => {
    if (!confirm(t('bookRequest.confirmDelete', 'Are you sure you want to delete this request?'))) {
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
      
      // Remove the deleted request from the list
      setRequests(prev => prev.filter(request => request.id !== id));
      
      // Show success message
      setSuccess('Request deleted successfully');
    } catch (err) {
      console.error('Error deleting book request:', err);
      setError('Failed to delete the request. Please try again later.');
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return 'Unknown date';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <FiClock />;
      case 'Approved':
        return <FiCheckCircle />;
      case 'Fulfilled':
        return <FiBookOpen />;
      case 'Rejected':
        return <FiAlertCircle />;
      default:
        return <FiClock />;
    }
  };
  
  if (authLoading || (isLoading && requests.length === 0)) {
    return (
      <Container>
        <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
      </Container>
    );
  }
  
  return (
    <Container>
      <Header>
        <Title>
          <FiBookOpen /> {t('bookRequest.title', 'Book Requests')}
        </Title>
      </Header>
      
      {error && (
        <Alert type="error">
          <FiAlertCircle />
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="success">
          <FiCheckCircle />
          {success}
        </Alert>
      )}
      
      <Card>
        <Tabs>
          <Tab 
            active={activeTab === 'form'} 
            onClick={() => setActiveTab('form')}
          >
            {t('bookRequest.newRequest', 'New Request')}
          </Tab>
          <Tab 
            active={activeTab === 'requests'} 
            onClick={() => setActiveTab('requests')}
          >
            {t('bookRequest.yourRequests', 'Your Requests')} ({requests.length})
          </Tab>
        </Tabs>
        
        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="title">{t('bookRequest.bookTitle', 'Book Title')} *</Label>
              <Input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder={t('bookRequest.bookTitlePlaceholder', 'Enter the book title')}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="author">{t('bookRequest.author', 'Author')}</Label>
              <Input
                id="author"
                name="author"
                type="text"
                value={formData.author}
                onChange={handleChange}
                placeholder={t('bookRequest.authorPlaceholder', 'Enter the author name (if known)')}
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
                <option value="Book">{t('bookRequest.formatBook', 'Book')}</option>
                <option value="Audiobook">{t('bookRequest.formatAudiobook', 'Audiobook')}</option>
                <option value="Either">{t('bookRequest.formatEither', 'Either')}</option>
              </Select>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="priority">{t('bookRequest.priority', 'Priority')}</Label>
              <Select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="Low">{t('bookRequest.priorityLow', 'Low')}</option>
                <option value="Medium">{t('bookRequest.priorityMedium', 'Medium')}</option>
                <option value="High">{t('bookRequest.priorityHigh', 'High')}</option>
              </Select>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="description">{t('bookRequest.description', 'Description')}</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t('bookRequest.descriptionPlaceholder', 'Add any additional details about the book or why you\'re requesting it')}
              />
            </FormGroup>
            
            <Button type="submit" disabled={isSubmitting}>
              <FiSend />
              {isSubmitting 
                ? t('bookRequest.submitting', 'Submitting...') 
                : t('bookRequest.submitRequest', 'Submit Request')}
            </Button>
          </form>
        ) : (
          <RequestsList>
            {requests.length === 0 ? (
              <EmptyState>
                {t('bookRequest.noRequests', 'You haven\'t made any book requests yet')}
              </EmptyState>
            ) : (
              requests.map(request => (
                <RequestCard key={request.id} status={request.status}>
                  <RequestTitle>{request.title}</RequestTitle>
                  <RequestDetails>
                    {request.author && <div>{t('bookRequest.by', 'by')} {request.author}</div>}
                    <div>
                      {request.language} • {t(`bookRequest.format${request.format}`, request.format)}
                      {request.priority && ` • ${t(`bookRequest.priority${request.priority}`, request.priority)} ${t('bookRequest.priority', 'Priority')}`}
                    </div>
                    {request.description && <div>{request.description}</div>}
                  </RequestDetails>
                  <RequestMeta>
                    <span>{t('bookRequest.requested', 'Requested')}: {formatDate(request.created_at)}</span>
                    <RequestStatus status={request.status}>
                      {getStatusIcon(request.status)}
                      {t(`bookRequest.status${request.status}`, request.status)}
                      {request.status === 'Pending' && (
                        <DeleteButton 
                          onClick={() => handleDeleteRequest(request.id)}
                          title={t('bookRequest.deleteRequest', 'Delete Request')}
                        >
                          {t('common.delete', 'Delete')}
                        </DeleteButton>
                      )}
                    </RequestStatus>
                  </RequestMeta>
                </RequestCard>
              ))
            )}
          </RequestsList>
        )}
      </Card>
    </Container>
  );
};

export default BookRequestPage;
