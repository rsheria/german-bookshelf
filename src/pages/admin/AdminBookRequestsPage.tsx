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
  FiTrash2,
  FiSearch,
  FiRefreshCw,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import {
  AdminContainer,
  AdminHeader,
  AdminTitle,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  LoadingState
} from '../../styles/adminStyles';

// Additional styled components specific to this page
const StatusBadge = styled.span<{ $variant: 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  
  ${props => {
    switch(props.$variant) {
      case 'Pending':
        return `
          background-color: rgba(247, 181, 0, 0.1);
          color: #f7b500;
        `;
      case 'Approved':
        return `
          background-color: rgba(63, 118, 156, 0.1);
          color: ${props.theme.colors.primary};
        `;
      case 'Fulfilled':
        return `
          background-color: rgba(40, 167, 69, 0.1);
          color: ${props.theme.colors.success};
        `;
      case 'Rejected':
        return `
          background-color: rgba(220, 53, 69, 0.1);
          color: ${props.theme.colors.danger};
        `;
      default:
        return `
          background-color: ${props.theme.colors.backgroundAlt};
          color: ${props.theme.colors.text};
        `;
    }
  }}
`;

const PriorityBadge = styled.span<{ $variant: 'High' | 'Medium' | 'Low' | null }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  
  ${props => {
    switch(props.$variant) {
      case 'High':
        return `
          background-color: rgba(220, 53, 69, 0.1);
          color: ${props.theme.colors.danger};
        `;
      case 'Medium':
        return `
          background-color: rgba(247, 181, 0, 0.1);
          color: #f7b500;
        `;
      case 'Low':
        return `
          background-color: rgba(40, 167, 69, 0.1);
          color: ${props.theme.colors.success};
        `;
      default:
        return `
          background-color: ${props.theme.colors.backgroundAlt};
          color: ${props.theme.colors.text};
        `;
    }
  }}
`;

const FiltersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};
`;

const FilterSelect = styled.select`
  padding: 0.625rem 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.sm};
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
  }
`;

const SearchBar = styled.div`
  display: flex;
  gap: 0.5rem;
  flex: 1;
  max-width: 400px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.625rem 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.sm};
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
  }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${props => props.theme.borderRadius.full};
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.textDim};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
    color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
  }
  
  &.edit:hover {
    color: ${props => props.theme.colors.primary};
    border-color: ${props => props.theme.colors.primary};
    background-color: rgba(63, 118, 156, 0.05);
  }
  
  &.delete:hover {
    color: ${props => props.theme.colors.danger};
    border-color: ${props => props.theme.colors.danger};
    background-color: rgba(220, 53, 69, 0.05);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

// Modal styled components
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
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
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
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding-bottom: 1rem;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.xl};
  color: ${props => props.theme.colors.textDark};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textDim};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${props => props.theme.borderRadius.full};
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
    color: ${props => props.theme.colors.danger};
  }
`;

const RequestDetails = styled.div`
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.theme.colors.border};
`;

const DetailItem = styled.div`
  margin-bottom: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textDark};
  margin-right: 0.5rem;
  min-width: 100px;
`;

const DetailValue = styled.span`
  color: ${props => props.theme.colors.text};
  flex: 1;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textDark};
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  font-size: ${props => props.theme.typography.fontSize.base};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  color: ${props => props.theme.colors.text};
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  font-size: ${props => props.theme.typography.fontSize.base};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundAlt};
  color: ${props => props.theme.colors.text};
  min-height: 120px;
  resize: vertical;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'success' | 'danger' | 'default' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.base};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;
  
  background-color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary': return theme.colors.primary;
      case 'success': return theme.colors.success;
      case 'danger': return theme.colors.danger;
      default: return theme.colors.backgroundAlt;
    }
  }};
  
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
      case 'success':
      case 'danger':
        return 'white';
      default:
        return theme.colors.text;
    }
  }};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.sm};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatusAlert = styled.div<{ $variant: 'error' | 'success' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1.5rem;
  
  ${props => {
    switch(props.$variant) {
      case 'error':
        return `
          background-color: rgba(220, 53, 69, 0.1);
          color: ${props.theme.colors.danger};
        `;
      case 'success':
        return `
          background-color: rgba(40, 167, 69, 0.1);
          color: ${props.theme.colors.success};
        `;
      case 'info':
        return `
          background-color: rgba(63, 118, 156, 0.1);
          color: ${props.theme.colors.primary};
        `;
      default:
        return `
          background-color: ${props.theme.colors.backgroundAlt};
          color: ${props.theme.colors.text};
        `;
    }
  }}
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
`;

const PageButton = styled.button<{ $active?: boolean }>`
  min-width: 36px;
  height: 36px;
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.$active 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  background-color: ${props => props.$active 
    ? props.theme.colors.primary 
    : props.theme.colors.backgroundAlt};
  color: ${props => props.$active 
    ? 'white' 
    : props.theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not([disabled]) {
    background-color: ${props => props.$active 
      ? props.theme.colors.primaryDark 
      : props.theme.colors.background};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.colors.textDim};
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.lg};
  margin: 1.5rem 0;
  font-style: italic;
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
  
  useEffect(() => {
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
          (request.requester_username && request.requester_username.toLowerCase().includes(query))
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
      // Use the admin_update_book_request function instead of direct update
      const { error } = await supabase
        .rpc('admin_update_book_request', {
          request_id: selectedRequest.id,
          new_status: editFormData.status,
          new_admin_notes: editFormData.admin_notes.trim() || null
        });
        
      if (error) {
        throw error;
      }
      
      // Determine the fulfilled_at date based on status
      const fulfilled_at = editFormData.status === 'Fulfilled' ? new Date().toISOString() : null;
      
      // Update local state with the changes
      setRequests(prev => 
        prev.map(request => 
          request.id === selectedRequest.id 
            ? { 
                ...request, 
                status: editFormData.status,
                admin_notes: editFormData.admin_notes.trim() || null,
                fulfilled_at: fulfilled_at,
                updated_at: new Date().toISOString()
              } 
            : request
        )
      );
      
      setSuccess('Request updated successfully!');
      handleCloseModal();
      
      // Refresh the data to ensure we have the latest changes
      fetchBookRequests();
    } catch (err) {
      console.error('Error updating book request:', err);
      setError('Failed to update the request. Please try again later.');
    }
  };
  
  // Handle delete request
  const handleDeleteRequest = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this request? This action cannot be undone.', 'Are you sure you want to delete this request? This action cannot be undone.'))) {
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
      <AdminContainer>
        <LoadingState>{t('Loading...', 'Loading...')}</LoadingState>
      </AdminContainer>
    );
  }
  
  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          <FiBookOpen style={{ marginRight: '0.5rem' }} /> {t('Manage Book Requests', 'Manage Book Requests')}
        </AdminTitle>
      </AdminHeader>
      
      {error && (
        <StatusAlert $variant="error">
          <FiAlertCircle />
          {error}
        </StatusAlert>
      )}
      
      {success && (
        <StatusAlert $variant="success">
          <FiCheckCircle />
          {success}
        </StatusAlert>
      )}
      
      <TableContainer>
        <FiltersContainer>
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t('All Statuses', 'All Statuses')}</option>
            <option value="Pending">{t('Pending', 'Pending')}</option>
            <option value="Approved">{t('Approved', 'Approved')}</option>
            <option value="Fulfilled">{t('Fulfilled', 'Fulfilled')}</option>
            <option value="Rejected">{t('Rejected', 'Rejected')}</option>
          </FilterSelect>
          
          <FilterSelect
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
          >
            <option value="all">{t('All Formats', 'All Formats')}</option>
            <option value="Book">{t('Book', 'Book')}</option>
            <option value="Audiobook">{t('Audiobook', 'Audiobook')}</option>
            <option value="Either">{t('Either', 'Either')}</option>
          </FilterSelect>
          
          <FilterSelect
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">{t('All Priorities', 'All Priorities')}</option>
            <option value="Low">{t('Low', 'Low')}</option>
            <option value="Medium">{t('Medium', 'Medium')}</option>
            <option value="High">{t('High', 'High')}</option>
          </FilterSelect>
          
          <SearchBar>
            <SearchInput
              type="text"
              placeholder={t('Search requests...', 'Search requests...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <IconButton>
              <FiSearch />
            </IconButton>
          </SearchBar>
          
          <IconButton onClick={handleResetFilters} title={t('Reset filters', 'Reset filters')}>
            <FiRefreshCw />
          </IconButton>
        </FiltersContainer>
        
        {filteredRequests.length === 0 ? (
          <EmptyState>
            {searchQuery || statusFilter !== 'all' || formatFilter !== 'all' || priorityFilter !== 'all'
              ? t('No matching requests found', 'No matching requests found')
              : t('No book requests yet', 'No book requests yet')}
          </EmptyState>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('Title', 'Title')}</TableHeader>
                  <TableHeader>{t('Format', 'Format')}</TableHeader>
                  <TableHeader>{t('Requester', 'Requester')}</TableHeader>
                  <TableHeader>{t('Status', 'Status')}</TableHeader>
                  <TableHeader>{t('Priority', 'Priority')}</TableHeader>
                  <TableHeader>{t('Requested', 'Requested')}</TableHeader>
                  <TableHeader>{t('Actions', 'Actions')}</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {currentRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <strong>{request.title}</strong>
                      {request.author && <div>{request.author}</div>}
                    </TableCell>
                    <TableCell>{request.format}</TableCell>
                    <TableCell>
                      {request.requester_username || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge $variant={request.status}>{request.status}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      {request.priority ? (
                        <PriorityBadge $variant={request.priority}>{request.priority}</PriorityBadge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(request.created_at)}</TableCell>
                    <TableCell>
                      <ActionButtons>
                        <IconButton 
                          className="edit" 
                          onClick={() => handleEditClick(request)}
                          title={t('Edit', 'Edit')}
                        >
                          <FiEdit />
                        </IconButton>
                        <IconButton 
                          className="delete" 
                          onClick={() => handleDeleteRequest(request.id)}
                          title={t('Delete', 'Delete')}
                        >
                          <FiTrash2 />
                        </IconButton>
                      </ActionButtons>
                    </TableCell>
                  </TableRow>
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
                
                <PageButton $active>
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
      </TableContainer>
      
      {/* Edit Modal */}
      {isEditModalOpen && selectedRequest && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{t('Edit Request', 'Edit Request')}</ModalTitle>
              <CloseButton onClick={handleCloseModal}>
                <FiX />
              </CloseButton>
            </ModalHeader>
            
            <RequestDetails>
              <DetailItem>
                <DetailLabel>{t('Title', 'Title')}:</DetailLabel>
                <DetailValue>{selectedRequest.title}</DetailValue>
              </DetailItem>
              {selectedRequest.author && (
                <DetailItem>
                  <DetailLabel>{t('Author', 'Author')}:</DetailLabel>
                  <DetailValue>{selectedRequest.author}</DetailValue>
                </DetailItem>
              )}
              <DetailItem>
                <DetailLabel>{t('Format', 'Format')}:</DetailLabel>
                <DetailValue>{selectedRequest.format}</DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>{t('Language', 'Language')}:</DetailLabel>
                <DetailValue>{selectedRequest.language}</DetailValue>
              </DetailItem>
              {selectedRequest.description && (
                <DetailItem>
                  <DetailLabel>{t('Description', 'Description')}:</DetailLabel>
                  <DetailValue>{selectedRequest.description}</DetailValue>
                </DetailItem>
              )}
              <DetailItem>
                <DetailLabel>{t('Requester', 'Requester')}:</DetailLabel>
                <DetailValue>
                  {selectedRequest.requester_username || 'Unknown'}
                </DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>{t('Requested', 'Requested')}:</DetailLabel>
                <DetailValue>{formatDate(selectedRequest.created_at)}</DetailValue>
              </DetailItem>
            </RequestDetails>
            
            <FormGroup>
              <Label htmlFor="status">{t('Status', 'Status')}</Label>
              <Select
                id="status"
                name="status"
                value={editFormData.status}
                onChange={handleEditFormChange}
              >
                <option value="Pending">{t('Pending', 'Pending')}</option>
                <option value="Approved">{t('Approved', 'Approved')}</option>
                <option value="Fulfilled">{t('Fulfilled', 'Fulfilled')}</option>
                <option value="Rejected">{t('Rejected', 'Rejected')}</option>
              </Select>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="admin_notes">{t('Admin Notes', 'Admin Notes')}</Label>
              <Textarea
                id="admin_notes"
                name="admin_notes"
                value={editFormData.admin_notes}
                onChange={handleEditFormChange}
                placeholder={t('Add notes about this request (only visible to admins)', 'Add notes about this request (only visible to admins)')}
              />
            </FormGroup>
            
            <Button $variant="primary" onClick={handleUpdateRequest}>
              <FiCheck />
              {t('Update Request', 'Update Request')}
            </Button>
          </ModalContent>
        </Modal>
      )}
    </AdminContainer>
  );
};

export default AdminBookRequestsPage;
