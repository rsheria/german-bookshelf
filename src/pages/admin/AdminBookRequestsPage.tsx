import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { 
  FiBookOpen, 
  FiCheck, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiX,
  FiEdit,
  FiTrash2
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

// Styled components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
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
  overflow: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 1rem;
  border-bottom: 2px solid #eee;
  color: #2c3e50;
  font-weight: 600;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #eee;
  color: #34495e;
`;

const Badge = styled.span<{ type: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 500;
  background-color: ${({ type }) => {
    switch (type) {
      case 'Pending': return '#fff8e1';
      case 'Approved': return '#e3f2fd';
      case 'Fulfilled': return '#e8f5e9';
      case 'Rejected': return '#ffebee';
      case 'High': return '#ffebee';
      case 'Medium': return '#fff8e1';
      case 'Low': return '#e8f5e9';
      default: return '#f5f5f5';
    }
  }};
  color: ${({ type }) => {
    switch (type) {
      case 'Pending': return '#f57c00';
      case 'Approved': return '#1976d2';
      case 'Fulfilled': return '#388e3c';
      case 'Rejected': return '#d32f2f';
      case 'High': return '#d32f2f';
      case 'Medium': return '#f57c00';
      case 'Low': return '#388e3c';
      default: return '#616161';
    }
  }};
`;

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const FilterSelect = styled.select`
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  color: #2c3e50;
  font-size: 0.9rem;
`;

const SearchInput = styled.input`
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex-grow: 1;
  min-width: 200px;
  font-size: 0.9rem;
  
  &:focus {
    border-color: #3498db;
    outline: none;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'success' | 'danger' | 'default' }>`
  background-color: ${({ variant }) => {
    switch (variant) {
      case 'primary': return '#3498db';
      case 'success': return '#2ecc71';
      case 'danger': return '#e74c3c';
      default: return '#7f8c8d';
    }
  }};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 2rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: #2c3e50;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  
  &:hover {
    background-color: #f1f1f1;
  }
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

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
`;

const PageButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ active }) => active ? '#3498db' : '#ddd'};
  background-color: ${({ active }) => active ? '#3498db' : 'white'};
  color: ${({ active }) => active ? 'white' : '#2c3e50'};
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: ${({ active }) => active ? '#2980b9' : '#f1f1f1'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NoDataMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #7f8c8d;
  font-style: italic;
`;

const RequestDetails = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
`;

const DetailItem = styled.div`
  margin-bottom: 0.5rem;
`;

const DetailLabel = styled.span`
  font-weight: 500;
  color: #2c3e50;
  margin-right: 0.5rem;
`;

const DetailValue = styled.span`
  color: #34495e;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
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
  admin_notes: string | null;
  requester_username?: string;
  requester_email?: string;
}

// Form data interface for editing
interface EditFormData {
  status: 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected';
  admin_notes: string;
}

const AdminBookRequestsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<BookRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BookRequest | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    status: 'Pending',
    admin_notes: ''
  });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 10;
  
  // Redirect if not logged in or not admin
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (!authLoading && user && !isAdmin) {
      navigate('/home');
    }
  }, [user, authLoading, isAdmin, navigate]);
  
  // Fetch all book requests
  useEffect(() => {
    const fetchBookRequests = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Use the admin view to get requests with user info
        const { data, error } = await supabase
          .from('admin_book_requests')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        setRequests(data || []);
        setFilteredRequests(data || []);
      } catch (err) {
        console.error('Error fetching book requests:', err);
        setError('Failed to load book requests. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookRequests();
  }, [user]);
  
  // Apply filters
  useEffect(() => {
    let result = [...requests];
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(request => request.status === statusFilter);
    }
    
    // Format filter
    if (formatFilter !== 'all') {
      result = result.filter(request => request.format === formatFilter);
    }
    
    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(request => request.priority === priorityFilter);
    }
    
    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        request => 
          request.title.toLowerCase().includes(query) ||
          (request.author && request.author.toLowerCase().includes(query)) ||
          (request.description && request.description.toLowerCase().includes(query)) ||
          (request.requester_username && request.requester_username.toLowerCase().includes(query)) ||
          (request.requester_email && request.requester_email.toLowerCase().includes(query))
      );
    }
    
    setFilteredRequests(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [requests, statusFilter, formatFilter, priorityFilter, searchQuery]);
  
  // Get current requests for pagination
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = filteredRequests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Open edit modal
  const handleEditClick = (request: BookRequest) => {
    setSelectedRequest(request);
    setEditFormData({
      status: request.status,
      admin_notes: request.admin_notes || ''
    });
    setIsEditModalOpen(true);
  };
  
  // Close edit modal
  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedRequest(null);
  };
  
  // Handle form input changes
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle update request
  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const updateData: any = {
        status: editFormData.status,
        admin_notes: editFormData.admin_notes.trim() || null,
        updated_at: new Date().toISOString()
      };
      
      // Set fulfilled_at if status is being changed to Fulfilled
      if (editFormData.status === 'Fulfilled' && selectedRequest.status !== 'Fulfilled') {
        updateData.fulfilled_at = new Date().toISOString();
      } else if (editFormData.status !== 'Fulfilled') {
        updateData.fulfilled_at = null;
      }
      
      const { error } = await supabase
        .from('book_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setRequests(prev => 
        prev.map(request => 
          request.id === selectedRequest.id 
            ? { ...request, ...updateData } 
            : request
        )
      );
      
      setSuccess('Request updated successfully!');
      handleCloseModal();
    } catch (err) {
      console.error('Error updating book request:', err);
      setError('Failed to update the request. Please try again later.');
    }
  };
  
  // Handle delete request
  const handleDeleteRequest = async (id: string) => {
    if (!confirm(t('admin.confirmDelete', 'Are you sure you want to delete this request? This action cannot be undone.'))) {
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
      
      // Update local state
      setRequests(prev => prev.filter(request => request.id !== id));
      setSuccess('Request deleted successfully!');
    } catch (err) {
      console.error('Error deleting book request:', err);
      setError('Failed to delete the request. Please try again later.');
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    
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
      return 'Invalid date';
    }
  };
  
  // Reset all filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setFormatFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
  };
  
  if (authLoading || isLoading) {
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
          <FiBookOpen /> {t('admin.bookRequestsTitle', 'Manage Book Requests')}
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
        <Filters>
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t('admin.allStatuses', 'All Statuses')}</option>
            <option value="Pending">{t('admin.statusPending', 'Pending')}</option>
            <option value="Approved">{t('admin.statusApproved', 'Approved')}</option>
            <option value="Fulfilled">{t('admin.statusFulfilled', 'Fulfilled')}</option>
            <option value="Rejected">{t('admin.statusRejected', 'Rejected')}</option>
          </FilterSelect>
          
          <FilterSelect
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
          >
            <option value="all">{t('admin.allFormats', 'All Formats')}</option>
            <option value="Book">{t('admin.formatBook', 'Book')}</option>
            <option value="Audiobook">{t('admin.formatAudiobook', 'Audiobook')}</option>
            <option value="Either">{t('admin.formatEither', 'Either')}</option>
          </FilterSelect>
          
          <FilterSelect
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">{t('admin.allPriorities', 'All Priorities')}</option>
            <option value="Low">{t('admin.priorityLow', 'Low')}</option>
            <option value="Medium">{t('admin.priorityMedium', 'Medium')}</option>
            <option value="High">{t('admin.priorityHigh', 'High')}</option>
          </FilterSelect>
          
          <SearchInput
            type="text"
            placeholder={t('admin.searchRequests', 'Search requests...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <Button onClick={handleResetFilters}>
            <FiX />
            {t('admin.resetFilters', 'Reset')}
          </Button>
        </Filters>
        
        {filteredRequests.length === 0 ? (
          <NoDataMessage>
            {searchQuery || statusFilter !== 'all' || formatFilter !== 'all' || priorityFilter !== 'all'
              ? t('admin.noMatchingRequests', 'No matching requests found')
              : t('admin.noRequests', 'No book requests yet')}
          </NoDataMessage>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.title', 'Title')}</Th>
                  <Th>{t('admin.format', 'Format')}</Th>
                  <Th>{t('admin.requester', 'Requester')}</Th>
                  <Th>{t('admin.status', 'Status')}</Th>
                  <Th>{t('admin.priority', 'Priority')}</Th>
                  <Th>{t('admin.requested', 'Requested')}</Th>
                  <Th>{t('admin.actions', 'Actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {currentRequests.map(request => (
                  <tr key={request.id}>
                    <Td>
                      <strong>{request.title}</strong>
                      {request.author && <div>{request.author}</div>}
                    </Td>
                    <Td>{request.format}</Td>
                    <Td>
                      {request.requester_username || 'Unknown'}
                      {request.requester_email && <div>{request.requester_email}</div>}
                    </Td>
                    <Td>
                      <Badge type={request.status}>{request.status}</Badge>
                    </Td>
                    <Td>
                      {request.priority ? (
                        <Badge type={request.priority}>{request.priority}</Badge>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td>{formatDate(request.created_at)}</Td>
                    <Td>
                      <ActionButtons>
                        <Button 
                          variant="primary" 
                          onClick={() => handleEditClick(request)}
                          title={t('admin.edit', 'Edit')}
                        >
                          <FiEdit />
                        </Button>
                        <Button 
                          variant="danger" 
                          onClick={() => handleDeleteRequest(request.id)}
                          title={t('admin.delete', 'Delete')}
                        >
                          <FiTrash2 />
                        </Button>
                      </ActionButtons>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            {totalPages > 1 && (
              <Pagination>
                <PageButton 
                  onClick={() => paginate(1)} 
                  disabled={currentPage === 1}
                >
                  &laquo;
                </PageButton>
                <PageButton 
                  onClick={() => paginate(currentPage - 1)} 
                  disabled={currentPage === 1}
                >
                  &lt;
                </PageButton>
                
                <PageButton active>
                  {currentPage} / {totalPages}
                </PageButton>
                
                <PageButton 
                  onClick={() => paginate(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                >
                  &gt;
                </PageButton>
                <PageButton 
                  onClick={() => paginate(totalPages)} 
                  disabled={currentPage === totalPages}
                >
                  &raquo;
                </PageButton>
              </Pagination>
            )}
          </>
        )}
      </Card>
      
      {/* Edit Modal */}
      {isEditModalOpen && selectedRequest && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{t('admin.editRequest', 'Edit Request')}</ModalTitle>
              <CloseButton onClick={handleCloseModal}>
                <FiX />
              </CloseButton>
            </ModalHeader>
            
            <RequestDetails>
              <DetailItem>
                <DetailLabel>{t('admin.title', 'Title')}:</DetailLabel>
                <DetailValue>{selectedRequest.title}</DetailValue>
              </DetailItem>
              {selectedRequest.author && (
                <DetailItem>
                  <DetailLabel>{t('admin.author', 'Author')}:</DetailLabel>
                  <DetailValue>{selectedRequest.author}</DetailValue>
                </DetailItem>
              )}
              <DetailItem>
                <DetailLabel>{t('admin.format', 'Format')}:</DetailLabel>
                <DetailValue>{selectedRequest.format}</DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>{t('admin.language', 'Language')}:</DetailLabel>
                <DetailValue>{selectedRequest.language}</DetailValue>
              </DetailItem>
              {selectedRequest.description && (
                <DetailItem>
                  <DetailLabel>{t('admin.description', 'Description')}:</DetailLabel>
                  <DetailValue>{selectedRequest.description}</DetailValue>
                </DetailItem>
              )}
              <DetailItem>
                <DetailLabel>{t('admin.requester', 'Requester')}:</DetailLabel>
                <DetailValue>
                  {selectedRequest.requester_username || 'Unknown'} 
                  {selectedRequest.requester_email && ` (${selectedRequest.requester_email})`}
                </DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>{t('admin.requested', 'Requested')}:</DetailLabel>
                <DetailValue>{formatDate(selectedRequest.created_at)}</DetailValue>
              </DetailItem>
            </RequestDetails>
            
            <FormGroup>
              <Label htmlFor="status">{t('admin.status', 'Status')}</Label>
              <Select
                id="status"
                name="status"
                value={editFormData.status}
                onChange={handleEditFormChange}
              >
                <option value="Pending">{t('admin.statusPending', 'Pending')}</option>
                <option value="Approved">{t('admin.statusApproved', 'Approved')}</option>
                <option value="Fulfilled">{t('admin.statusFulfilled', 'Fulfilled')}</option>
                <option value="Rejected">{t('admin.statusRejected', 'Rejected')}</option>
              </Select>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="admin_notes">{t('admin.notes', 'Admin Notes')}</Label>
              <Textarea
                id="admin_notes"
                name="admin_notes"
                value={editFormData.admin_notes}
                onChange={handleEditFormChange}
                placeholder={t('admin.notesPlaceholder', 'Add notes about this request (only visible to admins)')}
              />
            </FormGroup>
            
            <Button variant="primary" onClick={handleUpdateRequest}>
              <FiCheck />
              {t('admin.updateRequest', 'Update Request')}
            </Button>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default AdminBookRequestsPage;
