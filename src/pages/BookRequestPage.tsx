import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiCheckCircle, FiAlertCircle, FiX, FiLoader, FiSend, FiList, FiPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import {
  AdminContainer,
  LoadingState,
  Badge,
  ActionButton
} from '../styles/adminStyles';

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
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  padding: ${props => props.theme.spacing.md};
  background-color: ${({ active, theme }) => (active ? theme.colors.primary : 'transparent')};
  color: ${({ active, theme }) => (active ? 'white' : theme.colors.text)};
  border: none;
  cursor: pointer;
  font-weight: ${({ active, theme }) => (active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal)};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ active, theme }) => (active ? theme.colors.primaryDark : theme.colors.backgroundAlt)};
  }
`;

const FormContainer = styled.div`
  padding: ${props => props.theme.spacing.xl};
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

const SubmitButton = styled(ActionButton)`
  margin-top: ${props => props.theme.spacing.md};
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

const RequestList = styled.div`
  padding: ${props => props.theme.spacing.xl};
`;

const RequestItem = styled.div`
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
  background-color: ${props => props.theme.colors.card};
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: ${props => props.theme.shadows.md};
    transform: translateY(-2px);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const RequestHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const RequestTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.primary};
  font-family: ${props => props.theme.typography.fontFamily.heading};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
`;

const RequestStatus = styled(Badge)`
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RequestInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const InfoItem = styled.div`
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const InfoLabel = styled.span`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
  display: block;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const InfoValue = styled.span`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.text};
`;

const RequestDescription = styled.div`
  margin-top: ${props => props.theme.spacing.md};
  padding-top: ${props => props.theme.spacing.md};
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const AdminNotes = styled.div`
  margin-top: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.md};
`;

const AdminNotesLabel = styled.span`
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  color: ${props => props.theme.colors.textLight};
  display: block;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.xl};
  color: ${props => props.theme.colors.textLight};
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.md};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.md};
  
  svg {
    font-size: 3rem;
    opacity: 0.5;
    margin-bottom: ${props => props.theme.spacing.md};
    color: ${props => props.theme.colors.textLight};
  }
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.error};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.md};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(166, 89, 83, 0.1);
    transform: translateY(-1px);
  }
  
  &:disabled {
    color: ${props => props.theme.colors.textLight};
    cursor: not-allowed;
  }
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
  
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'form'
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    author: '',
    language: 'German',
    format: 'Ebook',
    description: '',
    priority: 'Medium'
  });
  
  useEffect(() => {
    if (user) {
      fetchBookRequests();
    } else if (!authLoading) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);
  
  // Fetch user's book requests
  const fetchBookRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) return;
      
      const { data, error: fetchError } = await supabase
        .from('book_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      // Set request status based on database values
      const mappedRequests = (data || []).map(request => ({
        ...request,
        // Map database status values to display values
        status: request.status === 'pending' ? 'Pending' :
                request.status === 'approved' ? 'Approved' :
                request.status === 'fulfilled' ? 'Fulfilled' :
                request.status === 'rejected' ? 'Declined' :
                'Pending' // Default
      }));
      
      setRequests(mappedRequests);
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
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle deleting a request
  const handleDeleteRequest = async (id: string) => {
    if (!confirm(t('bookRequest.confirmDelete', 'Are you sure you want to delete this request?'))) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error: deleteError } = await supabase
        .from('book_requests')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        throw new Error(deleteError.message);
      }
      
      // Update the local state
      setRequests(prev => prev.filter(request => request.id !== id));
      setSuccess(t('bookRequest.deleteSuccess', 'Request deleted successfully'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
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
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim()) {
      setError(t('bookRequest.titleRequired', 'Book title is required'));
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (!user) {
        throw new Error(t('common.loginRequired', 'You must be logged in to submit a request'));
      }
      
      const { data, error: submitError } = await supabase
        .from('book_requests')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            author: formData.author || null,
            language: formData.language,
            format: formData.format,
            description: formData.description || null,
            priority: formData.priority,
            status: 'pending', // Default status
          }
        ])
        .select();
      
      if (submitError) {
        throw new Error(submitError.message);
      }
      
      // Reset form
      setFormData({
        title: '',
        author: '',
        language: 'German',
        format: 'Ebook',
        description: '',
        priority: 'Medium'
      });
      
      // Show success message
      setSuccess(t('bookRequest.submitSuccess', 'Request submitted successfully'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
      // Add the new request to the list and switch to requests tab
      if (data && data.length > 0) {
        const newRequest = {
          ...data[0],
          status: 'Pending', // Formatted for display
        };
        
        setRequests(prev => [newRequest, ...prev]);
        setActiveTab('requests');
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('common.unknownError', 'An unknown error occurred'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateString;
    }
  };
  
  // Get variant for status badge
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Fulfilled': return 'secondary';
      case 'Declined': return 'error';
      default: return 'primary';
    }
  };
  
  if (authLoading) {
    return (
      <AdminContainer>
        <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
      </AdminContainer>
    );
  }
  
  if (!user) {
    return null; // Will redirect to login
  }
  
  return (
    <AdminContainer>
      <PageHeader>
        <PageTitle>{t('bookRequest.title', 'Book Requests')}</PageTitle>
        <Subtitle>
          {t('bookRequest.subtitle', 'Request books you would like to see in our collection')}
        </Subtitle>
      </PageHeader>
      
      {error && (
        <div style={{ 
          backgroundColor: 'rgba(166, 89, 83, 0.1)', 
          color: '#A65953', 
          padding: '1rem', 
          borderRadius: '0.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem' 
        }}>
          <FiAlertCircle /> {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          backgroundColor: 'rgba(94, 139, 126, 0.1)', 
          color: '#5E8B7E', 
          padding: '1rem', 
          borderRadius: '0.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem' 
        }}>
          <FiCheckCircle /> {success}
        </div>
      )}
      
      <Card>
        <Tabs>
          <Tab 
            active={activeTab === 'requests'} 
            onClick={() => setActiveTab('requests')}
          >
            <FiList style={{ marginRight: '0.5rem' }} />
            {t('bookRequest.myRequests', 'My Requests')}
          </Tab>
          <Tab 
            active={activeTab === 'form'} 
            onClick={() => setActiveTab('form')}
          >
            <FiPlus style={{ marginRight: '0.5rem' }} />
            {t('bookRequest.newRequest', 'New Request')}
          </Tab>
        </Tabs>
        
        {activeTab === 'form' ? (
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
                  placeholder={t('bookRequest.titlePlaceholder', 'Enter book title')}
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
                  placeholder={t('bookRequest.authorPlaceholder', 'Enter author name (if known)')}
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
                <Label htmlFor="format">{t('bookRequest.format', 'Preferred Format')}</Label>
                <Select
                  id="format"
                  name="format"
                  value={formData.format}
                  onChange={handleChange}
                >
                  <option value="Ebook">Ebook</option>
                  <option value="Audiobook">Audiobook</option>
                  <option value="Print">Print</option>
                  <option value="Any">Any</option>
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
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="description">{t('bookRequest.description', 'Description / Notes')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('bookRequest.descriptionPlaceholder', 'Add any additional details...')}
                />
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
                  <>
                    <FiSend />
                    {t('bookRequest.submitRequest', 'Submit Request')}
                  </>
                )}
              </SubmitButton>
            </form>
          </FormContainer>
        ) : (
          <RequestList>
            {isLoading ? (
              <LoadingState>
                <LoadingSpinner>
                  <FiLoader size={24} />
                </LoadingSpinner>
                {t('common.loading', 'Loading...')}
              </LoadingState>
            ) : requests.length === 0 ? (
              <EmptyState>
                <FiList size={48} />
                {t('bookRequest.noRequests', 'You have not made any book requests yet.')}
                <ActionButton onClick={() => setActiveTab('form')} className="secondary">
                  <FiPlus />
                  {t('bookRequest.createRequest', 'Create a Request')}
                </ActionButton>
              </EmptyState>
            ) : (
              requests.map(request => (
                <RequestItem key={request.id}>
                  <RequestHeader>
                    <RequestTitle>{request.title}</RequestTitle>
                    <RequestStatus variant={getStatusVariant(request.status) as any}>
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
                        <FiX size={14} />
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
    </AdminContainer>
  );
};

export default BookRequestPage;
