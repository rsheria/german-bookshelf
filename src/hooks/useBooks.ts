import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Book, BookType } from '../types/supabase';

// Mock data to use when Supabase is not configured
const mockBooks: Book[] = [
  {
    id: '1',
    title: 'Der Prozess',
    author: 'Franz Kafka',
    description: 'Ein Roman über einen Mann, der ohne ersichtlichen Grund verhaftet und in ein undurchsichtiges Gerichtsverfahren verwickelt wird.',
    cover_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2942&auto=format&fit=crop',
    type: 'ebook',
    genre: 'Fiction',
    language: 'German',
    file_url: '#',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Die Verwandlung',
    author: 'Franz Kafka',
    description: 'Die Geschichte von Gregor Samsa, der eines Morgens als riesiges Insekt aufwacht.',
    cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=2787&auto=format&fit=crop',
    type: 'ebook',
    genre: 'Fiction',
    language: 'German',
    file_url: '#',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Faust',
    author: 'Johann Wolfgang von Goethe',
    description: 'Ein Gelehrter, der mit dem Teufel einen Pakt schließt.',
    cover_url: 'https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?q=80&w=2835&auto=format&fit=crop',
    type: 'audiobook',
    genre: 'Classic',
    language: 'German',
    file_url: '#',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Buddenbrooks',
    author: 'Thomas Mann',
    description: 'Die Geschichte vom Verfall einer Familie.',
    cover_url: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?q=80&w=2829&auto=format&fit=crop',
    type: 'audiobook',
    genre: 'Classic',
    language: 'German',
    file_url: '#',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Die Blechtrommel',
    author: 'Günter Grass',
    description: 'Die Geschichte von Oskar Matzerath, der mit drei Jahren beschließt, nicht mehr zu wachsen.',
    cover_url: 'https://images.unsplash.com/photo-1490633874781-1c63cc424610?q=80&w=2940&auto=format&fit=crop',
    type: 'ebook',
    genre: 'Fiction',
    language: 'German',
    file_url: '#',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6',
    title: 'Der Zauberberg',
    author: 'Thomas Mann',
    description: 'Ein junger Mann besucht seinen Cousin in einem Sanatorium und bleibt dort sieben Jahre.',
    cover_url: 'https://images.unsplash.com/photo-1518281361980-b26bfd556770?q=80&w=2940&auto=format&fit=crop',
    type: 'audiobook',
    genre: 'Classic',
    language: 'German',
    file_url: '#',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Check if Supabase is configured
const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    
    // If Supabase is not configured, use mock data
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        let filteredBooks = [...mockBooks];
        
        // Apply filters to mock data
        if (type) {
          filteredBooks = filteredBooks.filter(book => book.type === type);
        }
        
        if (genre && genre !== 'all') {
          filteredBooks = filteredBooks.filter(book => book.genre === genre);
        }
        
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredBooks = filteredBooks.filter(book => 
            book.title.toLowerCase().includes(term) || 
            book.author.toLowerCase().includes(term) || 
            book.description.toLowerCase().includes(term)
          );
        }
        
        // Apply pagination
        const from = page * limit;
        const to = from + limit;
        const paginatedBooks = filteredBooks.slice(from, to);
        
        setBooks(paginatedBooks);
        setTotalCount(filteredBooks.length);
        setIsLoading(false);
      }, 500); // Simulate network delay
      
      return;
    }
    
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
    
    // If Supabase is not configured, use mock data
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const foundBook = mockBooks.find(book => book.id === id);
        
        if (foundBook) {
          setBook(foundBook);
        } else {
          setError(new Error('Book not found'));
        }
        
        setIsLoading(false);
      }, 500); // Simulate network delay
      
      return;
    }
    
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
