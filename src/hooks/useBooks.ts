import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Book, BookType } from '../types/supabase';

interface UseBooksProps {
  type?: BookType;
  searchTerm?: string;
  genre?: string;
  limit?: number;
  page?: number;
}

interface UseBooksResult {
  books: Book[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  fetchBooks: () => Promise<void>;
}

export const useBooks = ({
  type,
  searchTerm = '',
  genre = '',
  limit = 12,
  page = 0
}: UseBooksProps = {}): UseBooksResult => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchBooks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('books')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (type) {
        query = query.eq('type', type);
      }
      
      if (genre && genre !== 'all') {
        query = query.eq('genre', genre);
      }
      
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      // Apply pagination
      const from = page * limit;
      const to = from + limit - 1;
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) {
        throw error;
      }
      
      setBooks(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching books:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [type, searchTerm, genre, limit, page]);

  return { books, isLoading, error, totalCount, fetchBooks };
};

export const useBook = (id: string) => {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBook = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
      setBook(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching book:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBook();
    }
  }, [id]);

  return { book, isLoading, error, fetchBook };
};
