import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiEdit, FiTrash2, FiPlus, FiSearch, FiDownload, FiActivity, FiEye, FiArchive, FiBook } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import {
  AdminContainer,
  AdminHeader,
  AdminTitle,
  AdminSubtitle,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  LoadingState,
  ActionButton,
  ControlsContainer,
  FilterDropdown
} from '../../styles/adminStyles';

// Additional styled components specific to this page
const SearchBar = styled.div`
  display: flex;
  gap: 0.5rem;
  flex: 1;
  max-width: 500px;

  input {
    flex: 1;
    padding: 0.625rem 1rem;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.borderRadius.md};
    font-size: ${props => props.theme.typography.fontSize.base};
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.colors.card};
    transition: all 0.2s;
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary};
      box-shadow: 0 0 0 2px rgba(63, 118, 156, 0.1);
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
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
  
  &.view:hover {
    color: ${props => props.theme.colors.success};
    border-color: ${props => props.theme.colors.success};
    background-color: rgba(40, 167, 69, 0.05);
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
`;

const PageInfo = styled.div`
  color: ${props => props.theme.colors.textDim};
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

const PageButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const PageButton = styled.button<{ active?: boolean }>`
  min-width: 36px;
  height: 36px;
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.active 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  background-color: ${props => props.active 
    ? props.theme.colors.primary 
    : 'transparent'};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not([disabled]) {
    background-color: ${props => props.active 
      ? props.theme.colors.primaryDark 
      : props.theme.colors.backgroundAlt};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Chip = styled.span<{ variant?: 'audiobook' | 'ebook' | 'advanced' | 'intermediate' | 'beginner' }>`
  padding: 0.25rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  display: inline-flex;
  align-items: center;
  
  ${props => {
    switch(props.variant) {
      case 'audiobook':
        return `
          background-color: rgba(63, 118, 156, 0.1);
          color: ${props.theme.colors.primary};
        `;
      case 'ebook':
        return `
          background-color: rgba(216, 181, 137, 0.1);
          color: #BF9B6F;
        `;
      case 'advanced':
        return `
          background-color: rgba(220, 53, 69, 0.1);
          color: ${props.theme.colors.danger};
        `;
      case 'intermediate':
        return `
          background-color: rgba(255, 193, 7, 0.1);
          color: #de9e1f;
        `;
      case 'beginner':
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

const ConfirmationModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  
  h3 {
    margin-top: 0;
    color: ${props => props.theme.colors.textDark};
    font-family: ${props => props.theme.typography.fontFamily.heading};
  }
  
  p {
    margin-bottom: 2rem;
    color: ${props => props.theme.colors.text};
  }
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const CancelButton = styled.button`
  padding: 0.625rem 1.25rem;
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.theme.colors.border};
  background-color: transparent;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const DeleteButton = styled.button`
  padding: 0.625rem 1.25rem;
  border-radius: ${props => props.theme.borderRadius.md};
  border: none;
  background-color: ${props => props.theme.colors.danger};
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: #c82333;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatsCard = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  
  .icon {
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.borderRadius.md};
    background-color: ${props => props.theme.colors.backgroundAlt};
    color: ${props => props.theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .content {
    .value {
      font-size: 1.5rem;
      font-weight: ${props => props.theme.typography.fontWeight.bold};
      color: ${props => props.theme.colors.textDark};
      line-height: 1.2;
    }
    
    .label {
      font-size: ${props => props.theme.typography.fontSize.sm};
      color: ${props => props.theme.colors.textDim};
    }
  }
`;

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  type: 'ebook' | 'audiobook';
  published_at: string;
  language: string;
  download_count: number;
}

const AdminBooksPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ebook' | 'audiobook'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [page, setPage] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);
  const [bookStats, setBookStats] = useState({
    total: 0,
    ebooks: 0,
    audiobooks: 0,
    totalDownloads: 0
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  
  const pageSize = 10;

  useEffect(() => {
    // Redirect if not admin
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    
    fetchBooks();
    fetchBookStats();
  }, [user, isAdmin, page, searchTerm, typeFilter, levelFilter]);

  const fetchBooks = async () => {
    if (!user || !isAdmin) return;
    
    setIsLoading(true);
    
    try {
      let query = supabase
        .from('books')
        .select('*', { count: 'exact' });
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`);
      }
      
      // Apply type filter
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }
      
      // Apply level filter
      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter);
      }
      
      // Get total count for pagination
      const { count } = await query;
      setTotalBooks(count || 0);
      
      // Fetch books with pagination
      const { data: booksData, error } = await query
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('title');
      
      if (error) {
        throw error;
      }
      
      setBooks(booksData as Book[]);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchBookStats = async () => {
    try {
      // Fetch total books
      const { count: total } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });
      
      // Fetch ebooks count
      const { count: ebooks } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'ebook');
      
      // Fetch audiobooks count
      const { count: audiobooks } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'audiobook');
        
      // Fetch total downloads
      const { count: totalDownloads } = await supabase
        .from('downloads')
        .select('*', { count: 'exact', head: true });
        
      setBookStats({
        total: total || 0,
        ebooks: ebooks || 0,
        audiobooks: audiobooks || 0,
        totalDownloads: totalDownloads || 0
      });
    } catch (error) {
      console.error('Error fetching book stats:', error);
    }
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0); // Reset to first page when search changes
  };
  
  const handleTypeFilterChange = (type: 'all' | 'ebook' | 'audiobook') => {
    setTypeFilter(type);
    setPage(0); // Reset to first page when filter changes
  };
  
  const handleLevelFilterChange = (level: 'all' | 'beginner' | 'intermediate' | 'advanced') => {
    setLevelFilter(level);
    setPage(0); // Reset to first page when filter changes
  };
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  const handleDeleteClick = (book: Book) => {
    setBookToDelete(book);
    setDeleteModalOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;
    
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookToDelete.id);
      
      if (error) {
        throw error;
      }
      
      // Refetch books after deletion
      fetchBooks();
      fetchBookStats();
      setDeleteModalOpen(false);
      setBookToDelete(null);
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (authLoading || isLoading) {
    return (
      <AdminContainer>
        <LoadingState>{t('common.loading', 'Loading...')}</LoadingState>
      </AdminContainer>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect to home
  }

  const totalPages = Math.ceil(totalBooks / pageSize);

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          <FiBook style={{ marginRight: '0.5rem' }} />
          {t('manageBooks', 'Manage Books')}
        </AdminTitle>
        <AdminSubtitle>
          {t('manageBooksSubtitle', 'View, edit and delete books in your library')}
        </AdminSubtitle>
      </AdminHeader>
      
      <StatsRow>
        <StatsCard>
          <div className="icon">
            <FiBook size={20} />
          </div>
          <div className="content">
            <div className="value">{bookStats.total}</div>
            <div className="label">{t('totalBooks', 'Total Books')}</div>
          </div>
        </StatsCard>
        
        <StatsCard>
          <div className="icon">
            <FiArchive size={20} />
          </div>
          <div className="content">
            <div className="value">{bookStats.ebooks}</div>
            <div className="label">{t('totalEbooks', 'E-books')}</div>
          </div>
        </StatsCard>
        
        <StatsCard>
          <div className="icon">
            <FiActivity size={20} />
          </div>
          <div className="content">
            <div className="value">{bookStats.audiobooks}</div>
            <div className="label">{t('totalAudiobooks', 'Audiobooks')}</div>
          </div>
        </StatsCard>
        
        <StatsCard>
          <div className="icon">
            <FiDownload size={20} />
          </div>
          <div className="content">
            <div className="value">{bookStats.totalDownloads}</div>
            <div className="label">{t('totalDownloads', 'Total Downloads')}</div>
          </div>
        </StatsCard>
      </StatsRow>
      
      <ControlsContainer>
        <SearchBar>
          <input 
            type="text" 
            placeholder={t('searchBooks', 'Search books...')} 
            value={searchTerm}
            onChange={handleSearch}
          />
          <IconButton style={{ width: 'auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
            <FiSearch style={{ marginRight: '0.5rem' }} />
            {t('search', 'Search')}
          </IconButton>
        </SearchBar>
        
        <FilterDropdown>
          <label>{t('filterByType', 'Filter by Type:')}</label>
          <select value={typeFilter} onChange={(e) => handleTypeFilterChange(e.target.value as any)}>
            <option value="all">{t('allTypes', 'All Types')}</option>
            <option value="ebook">{t('ebook', 'E-book')}</option>
            <option value="audiobook">{t('audiobook', 'Audiobook')}</option>
          </select>
        </FilterDropdown>
        
        <FilterDropdown>
          <label>{t('filterByLevel', 'Filter by Level:')}</label>
          <select value={levelFilter} onChange={(e) => handleLevelFilterChange(e.target.value as any)}>
            <option value="all">{t('allLevels', 'All Levels')}</option>
            <option value="beginner">{t('beginner', 'Beginner')}</option>
            <option value="intermediate">{t('intermediate', 'Intermediate')}</option>
            <option value="advanced">{t('advanced', 'Advanced')}</option>
          </select>
        </FilterDropdown>
        
        <ActionButton onClick={() => navigate('/admin/books/add')}>
          <FiPlus style={{ marginRight: '0.5rem' }} />
          {t('addBook', 'Add Book')}
        </ActionButton>
      </ControlsContainer>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>{t('title', 'Title')}</TableHeader>
              <TableHeader>{t('author', 'Author')}</TableHeader>
              <TableHeader>{t('type', 'Type')}</TableHeader>
              <TableHeader>{t('level', 'Level')}</TableHeader>
              <TableHeader>{t('published', 'Published')}</TableHeader>
              <TableHeader>{t('downloads', 'Downloads')}</TableHeader>
              <TableHeader>{t('actions', 'Actions')}</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {books.map((book) => (
              <TableRow key={book.id}>
                <TableCell>{book.title}</TableCell>
                <TableCell>{book.author}</TableCell>
                <TableCell>
                  <Chip variant={book.type}>
                    {book.type === 'audiobook' 
                      ? t('audiobook') 
                      : t('ebook')}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip variant={book.level}>
                    {t(`${book.level}`)}
                  </Chip>
                </TableCell>
                <TableCell>{formatDate(book.published_at)}</TableCell>
                <TableCell>{book.download_count || 0}</TableCell>
                <TableCell>
                  <ActionButtons>
                    <IconButton 
                      className="view"
                      onClick={() => navigate(`/books/${book.id}`)} 
                      aria-label={t('view')}
                    >
                      <FiEye size={16} />
                    </IconButton>
                    <IconButton 
                      className="edit"
                      onClick={() => navigate(`/admin/books/edit/${book.id}`)} 
                      aria-label={t('edit')}
                    >
                      <FiEdit size={16} />
                    </IconButton>
                    <IconButton 
                      className="delete"
                      onClick={() => handleDeleteClick(book)} 
                      aria-label={t('delete')}
                    >
                      <FiTrash2 size={16} />
                    </IconButton>
                  </ActionButtons>
                </TableCell>
              </TableRow>
            ))}
            
            {books.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} style={{ textAlign: 'center' }}>
                  {searchTerm || typeFilter !== 'all' || levelFilter !== 'all'
                    ? t('noSearchResults', 'No matching books found')
                    : t('noBooks', 'No books in the library yet')}
                </TableCell>
              </TableRow>
            )}
          </tbody>
        </Table>
      </TableContainer>
      
      {totalPages > 1 && (
        <Pagination>
          <PageInfo>
            {t('showingResults', {
              from: page * pageSize + 1,
              to: Math.min((page + 1) * pageSize, totalBooks),
              total: totalBooks
            })}
          </PageInfo>
          
          <PageButtons>
            <PageButton 
              onClick={() => handlePageChange(page - 1)} 
              disabled={page === 0}
              aria-label={t('previous')}
            >
              &laquo;
            </PageButton>
            
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              // Show 5 pages around current page
              let pageNum = 0;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <PageButton 
                  key={pageNum}
                  active={pageNum === page}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum + 1}
                </PageButton>
              );
            })}
            
            <PageButton 
              onClick={() => handlePageChange(page + 1)} 
              disabled={page === totalPages - 1}
              aria-label={t('next')}
            >
              &raquo;
            </PageButton>
          </PageButtons>
        </Pagination>
      )}
      
      {deleteModalOpen && bookToDelete && (
        <ConfirmationModal>
          <ModalContent>
            <h3>{t('deleteBookConfirmTitle', 'Delete Book')}</h3>
            <p>
              {t('deleteBookConfirmMessage', {
                title: bookToDelete.title
              })}
            </p>
            <ModalButtons>
              <CancelButton onClick={() => setDeleteModalOpen(false)}>
                {t('cancel', 'Cancel')}
              </CancelButton>
              <DeleteButton onClick={handleDeleteConfirm}>
                {t('delete', 'Delete')}
              </DeleteButton>
            </ModalButtons>
          </ModalContent>
        </ConfirmationModal>
      )}
    </AdminContainer>
  );
};

export default AdminBooksPage;
