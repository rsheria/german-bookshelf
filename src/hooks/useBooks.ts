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
const supabaseAvailable = supabase !== null;

interface UseBooksProps {
  type?: BookType;
  searchTerm?: string;
  genre?: string;
  year?: number | null;
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
  year = null,
  limit = 12,
  page = 0
}: UseBooksProps = {}): UseBooksResult => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchBooks = async () => {
    setIsLoading(true);
    setError(null);

    // If Supabase is not available, use mock data
    if (!supabaseAvailable) {
      console.log('Supabase not available, using mock data');
      setTimeout(() => {
        let filteredBooks = [...mockBooks];
        
        // Apply filters
        if (type) {
          filteredBooks = filteredBooks.filter(book => book.type === type);
        }
        
        if (genre && genre !== 'all') {
          filteredBooks = filteredBooks.filter(book => book.genre === genre);
        }
        
        if (year) {
          const publishYear = new Date(year, 0).getFullYear();
          filteredBooks = filteredBooks.filter(book => {
            const bookYear = new Date(book.created_at).getFullYear();
            return bookYear === publishYear;
          });
        }
        
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredBooks = filteredBooks.filter(book => 
            book.title.toLowerCase().includes(term) || 
            book.author.toLowerCase().includes(term) || 
            (book.description && book.description.toLowerCase().includes(term))
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
      // Only proceed if Supabase is configured
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
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
      
      if (year) {
        // Assuming created_at is in ISO format, filter by year
        const yearStart = new Date(year, 0, 1).toISOString();
        const yearEnd = new Date(year, 11, 31, 23, 59, 59).toISOString();
        query = query.gte('created_at', yearStart).lte('created_at', yearEnd);
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
      console.error('Error fetching books:', err);
      setError(err as Error);
      
      // Fallback to mock data on error
      console.log('Falling back to mock data due to error');
      let filteredBooks = [...mockBooks];
      
      // Apply filters (same as above)
      if (type) {
        filteredBooks = filteredBooks.filter(book => book.type === type);
      }
      
      if (genre && genre !== 'all') {
        filteredBooks = filteredBooks.filter(book => book.genre === genre);
      }
      
      if (year) {
        const publishYear = new Date(year, 0).getFullYear();
        filteredBooks = filteredBooks.filter(book => {
          const bookYear = new Date(book.created_at).getFullYear();
          return bookYear === publishYear;
        });
      }
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredBooks = filteredBooks.filter(book => 
          book.title.toLowerCase().includes(term) || 
          book.author.toLowerCase().includes(term) || 
          (book.description && book.description.toLowerCase().includes(term))
        );
      }
      
      // Apply pagination
      const from = page * limit;
      const to = from + limit;
      const paginatedBooks = filteredBooks.slice(from, to);
      
      setBooks(paginatedBooks);
      setTotalCount(filteredBooks.length);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [type, searchTerm, genre, year, limit, page]);

  return { books, isLoading, error, totalCount, fetchBooks };
};

export const useBook = (id: string) => {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBook = async () => {
    setIsLoading(true);
    setError(null);
    
    // If Supabase is not available, use mock data
    if (!supabaseAvailable) {
      setTimeout(() => {
        const mockBook = mockBooks.find(book => book.id === id);
        setBook(mockBook || null);
        setIsLoading(false);
      }, 500); // Simulate network delay
      
      return;
    }
    
    try {
      // Check if supabase is available
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
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

// Find related books based on current book's attributes
export const useRelatedBooks = (
  currentBook: Book | null,
  limit: number = 12
): {
  relatedBooks: Book[];
  isLoading: boolean;
  error: Error | null;
} => {
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRelatedBooks = async () => {
      if (!currentBook) {
        setRelatedBooks([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (!supabaseAvailable) {
          // Use mock data and simulate related books - force a small delay to simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          let related = [...mockBooks].filter(book => book.id !== currentBook.id);
          console.log("Current book:", currentBook);
          console.log("Available mock books for related:", related);
          
          // Force all mock books to be shown as related for testing
          setRelatedBooks(related);
          setIsLoading(false);
          console.log("Set mock related books:", related.length);
        } else {
          // Use Supabase for real data
          const query = supabase
            .from('books')
            .select('*')
            .neq('id', currentBook.id)
            .limit(50); // Get more than needed for processing
          
          // Get books from the same author
          const { data: authorBooks, error: authorError } = await query
            .eq('author', currentBook.author)
            .limit(6);
            
          if (authorError) throw authorError;
          
          // Get books of the same genre and type
          const { data: genreTypeBooks, error: genreError } = await query
            .eq('genre', currentBook.genre)
            .eq('type', currentBook.type)
            .neq('author', currentBook.author)
            .limit(12);
            
          if (genreError) throw genreError;
          
          // Get books in the same language
          const { data: languageBooks, error: langError } = await query
            .eq('language', currentBook.language)
            .neq('author', currentBook.author)
            .limit(12);
            
          if (langError) throw langError;
          
          // Combine and prioritize results
          let allRelated: Book[] = [];
          
          // Add author books first (highest priority)
          if (authorBooks) {
            allRelated.push(...authorBooks);
          }
          
          // Add genre+type books next (second priority)
          if (genreTypeBooks) {
            // Filter out any duplicates already added from author
            const uniqueGenreBooks = genreTypeBooks.filter(
              book => !allRelated.some(b => b.id === book.id)
            );
            allRelated.push(...uniqueGenreBooks);
          }
          
          // Add language books last (lowest priority)
          if (languageBooks) {
            // Filter out any duplicates already added
            const uniqueLangBooks = languageBooks.filter(
              book => !allRelated.some(b => b.id === book.id)
            );
            
            // For language books, try to prioritize those with similar keywords in title
            const currentBookKeywords = extractKeywords(currentBook.title);
            uniqueLangBooks.sort((a, b) => {
              const aKeywords = extractKeywords(a.title);
              const bKeywords = extractKeywords(b.title);
              
              const aCommon = aKeywords.filter(k => currentBookKeywords.includes(k)).length;
              const bCommon = bKeywords.filter(k => currentBookKeywords.includes(k)).length;
              
              return bCommon - aCommon; // Higher common count first
            });
            
            allRelated.push(...uniqueLangBooks);
          }
          
          // Limit to requested amount
          setRelatedBooks(allRelated.slice(0, limit));
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching related books:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch related books'));
        setIsLoading(false);
      }
    };

    fetchRelatedBooks();
  }, [currentBook, limit]);

  return { relatedBooks, isLoading, error };
};

// Helper function to extract keywords from a title
function extractKeywords(title: string): string[] {
  if (!title) return [];
  
  // Split by common separators and convert to lowercase
  const words = title.toLowerCase()
    .replace(/[^\w\s\-äöüß]/g, '') // Remove special chars except German umlauts
    .split(/[\s\-_]+/);
  
  // Filter out common stop words and short words
  const stopWords = [
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'von', 'mit', 'zu', 'auf', 'für',
    'an', 'in', 'über', 'unter', 'the', 'a', 'an', 'and', 'or', 'but', 'of', 'with', 'to', 'for',
    'at', 'in', 'on', 'by', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie'
  ];
  
  return words
    .filter(word => word.length > 2) // Filter very short words
    .filter(word => !stopWords.includes(word)); // Filter stop words
}
