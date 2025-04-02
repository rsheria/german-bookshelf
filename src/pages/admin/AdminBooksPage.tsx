import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiBook, FiEdit, FiTrash2, FiPlus, FiSearch, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseClient } from '../../utils/supabaseHelpers';
import { Book } from '../../types/supabase';

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
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #27ae60;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 0 1rem;
  flex-grow: 1;
  max-width: 400px;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  padding: 0.75rem 0;
  outline: none;
  font-size: 1rem;
  width: 100%;
`;

const FilterDropdown = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 1rem;
  outline: none;
  cursor: pointer;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const TableHead = styled.thead`
  background-color: #f8f9fa;
`;

const TableRow = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 1rem;
  font-weight: 600;
  color: #2c3e50;
`;

const TableCell = styled.td`
  padding: 1rem;
  color: #333;
`;

const BookCover = styled.img`
  width: 40px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const EditButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2980b9;
  }
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #c0392b;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
`;

const PageButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: ${({ active }) => (active ? '#3498db' : 'white')};
  color: ${({ active }) => (active ? 'white' : '#333')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ active }) => (active ? '#2980b9' : '#f5f5f5')};
  }

  &:disabled {
    background-color: #f5f5f5;
    color: #999;
    cursor: not-allowed;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
  background-color: #f8f9fa;
  border-radius: 8px;
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

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
`;

const ModalTitle = styled.h2`
  margin-top: 0;
  color: #2c3e50;
`;

const ModalText = styled.p`
  margin-bottom: 2rem;
  color: #333;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }
`;

const ConfirmButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  background-color: #e74c3c;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #c0392b;
  }
`;

const AdminBooksPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookType, setBookType] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  
  const limit = 10;

  useEffect(() => {
    // Redirect if not admin
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchBooks = async () => {
    if (!user || !isAdmin) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = getSupabaseClient()
        .from('books')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (bookType) {
        query = query.eq('type', bookType);
      }
      
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`);
      }
      
      // Apply pagination
      const from = page * limit;
      const to = from + limit - 1;
      
      const { data, error: fetchError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (fetchError) {
        throw fetchError;
      }
      
      setBooks(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [user, isAdmin, searchTerm, bookType, page]);

  const handleDeleteClick = (book: Book) => {
    setBookToDelete(book);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;
    
    try {
      const { error: deleteError } = await getSupabaseClient()
        .from('books')
        .delete()
        .eq('id', bookToDelete.id);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Refresh book list
      fetchBooks();
      
      // Close modal
      setDeleteModalOpen(false);
      setBookToDelete(null);
    } catch (err) {
      console.error('Error deleting book:', err);
      setError((err as Error).message);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);
  
  // Generate pagination buttons
  const renderPagination = () => {
    const buttons = [];
    
    // Previous button
    buttons.push(
      <PageButton 
        key="prev" 
        onClick={() => setPage(prev => Math.max(0, prev - 1))}
        disabled={page === 0}
      >
        {t('common.previous')}
      </PageButton>
    );
    
    // Page numbers
    const startPage = Math.max(0, page - 2);
    const endPage = Math.min(totalPages - 1, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <PageButton 
          key={i} 
          active={i === page}
          onClick={() => setPage(i)}
        >
          {i + 1}
        </PageButton>
      );
    }
    
    // Next button
    buttons.push(
      <PageButton 
        key="next" 
        onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
        disabled={page >= totalPages - 1}
      >
        {t('common.next')}
      </PageButton>
    );
    
    return buttons;
  };

  if (authLoading || isLoading) {
    return (
      <Container>
        <LoadingState>{t('common.loading')}</LoadingState>
      </Container>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect to home
  }

  return (
    <Container>
      <Header>
        <Title>
          <FiBook /> {t('admin.manageBooks')}
        </Title>
        
        <AddButton onClick={() => navigate('/admin/books/add')}>
          <FiPlus /> {t('admin.addBook')}
        </AddButton>
      </Header>
      
      {error && (
        <Alert>
          <FiAlertCircle />
          {error}
        </Alert>
      )}
      
      <Controls>
        <SearchBar>
          <FiSearch style={{ color: '#666', marginRight: '0.5rem' }} />
          <SearchInput
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0); // Reset to first page on search
            }}
          />
        </SearchBar>
        
        <FilterDropdown
          value={bookType}
          onChange={(e) => {
            setBookType(e.target.value);
            setPage(0); // Reset to first page on filter change
          }}
        >
          <option value="">{t('books.allTypes')}</option>
          <option value="audiobook">{t('books.audiobook')}</option>
          <option value="ebook">{t('books.ebook')}</option>
        </FilterDropdown>
      </Controls>
      
      {books.length > 0 ? (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader style={{ width: '60px' }}></TableHeader>
                <TableHeader>{t('books.title')}</TableHeader>
                <TableHeader>{t('books.author')}</TableHeader>
                <TableHeader>{t('books.genre')}</TableHeader>
                <TableHeader>{t('books.type')}</TableHeader>
                <TableHeader style={{ width: '120px' }}>{t('common.actions')}</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>
                    <BookCover 
                      src={book.cover_url || 'https://via.placeholder.com/40x60?text=No+Cover'} 
                      alt={book.title}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/40x60?text=No+Cover';
                      }}
                    />
                  </TableCell>
                  <TableCell>{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.genre}</TableCell>
                  <TableCell>
                    {book.type === 'audiobook' 
                      ? t('books.audiobook') 
                      : t('books.ebook')}
                  </TableCell>
                  <TableCell>
                    <ActionButtons>
                      <EditButton 
                        title={t('common.edit')}
                        onClick={() => navigate(`/admin/books/edit/${book.id}`)}
                      >
                        <FiEdit />
                      </EditButton>
                      <DeleteButton 
                        title={t('common.delete')}
                        onClick={() => handleDeleteClick(book)}
                      >
                        <FiTrash2 />
                      </DeleteButton>
                    </ActionButtons>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
          
          {totalPages > 1 && (
            <Pagination>
              {renderPagination()}
            </Pagination>
          )}
        </>
      ) : (
        <EmptyState>
          {searchTerm || bookType 
            ? t('admin.noMatchingBooks') 
            : t('admin.noBooks')}
        </EmptyState>
      )}
      
      {deleteModalOpen && bookToDelete && (
        <Modal>
          <ModalContent>
            <ModalTitle>{t('admin.confirmDelete')}</ModalTitle>
            <ModalText>
              {t('admin.deleteBookConfirmation', { title: bookToDelete.title })}
            </ModalText>
            <ModalButtons>
              <CancelButton onClick={() => setDeleteModalOpen(false)}>
                {t('common.cancel')}
              </CancelButton>
              <ConfirmButton onClick={handleDeleteConfirm}>
                {t('common.delete')}
              </ConfirmButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default AdminBooksPage;
