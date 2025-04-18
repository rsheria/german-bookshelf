import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Book, BookType } from '../types/supabase';

// Check if Supabase is configured
const supabaseAvailable = supabase && supabase.from;

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
  }
];

// Types
interface UseBooksProps {
  type?: BookType;
  searchTerm?: string;
  genres?: string[];
  year?: number | null;
  limit?: number;
  page?: number;
  categories?: string[];
  fileType?: string | null;
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
  genres = [],
  year = null,
  limit = 12,
  page = 0,
  categories = [],
  fileType = null
}: UseBooksProps = {}): UseBooksResult => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Function to fetch books based on current filters
  const fetchBooks = async () => {
    console.log('🔥 FETCH BOOKS CALLED with categories:', categories);
    setIsLoading(true);
    setError(null);
    
    try {
      // Use mock data when Supabase is not available
      if (!supabaseAvailable) {
        console.log('Using mock data with categories:', categories);
        setTimeout(() => {
          let filteredBooks = [...mockBooks];
          
          // Apply basic filters
          if (type) {
            filteredBooks = filteredBooks.filter(b => b.type === type);
          }
          
          // Apply category filters (AND logic)
          if (categories && categories.length > 0) {
            console.log('Filtering by categories:', categories);
            
            filteredBooks = filteredBooks.filter(book => {
              // Book must match ALL selected categories
              return categories.every(category => {
                const cat = category.toLowerCase().trim();
                
                // Check in categories array
                if (book.categories && Array.isArray(book.categories)) {
                  const hasMatchInArray = book.categories.some(bookCat => 
                    typeof bookCat === 'string' && 
                    bookCat.toLowerCase().includes(cat)
                  );
                  if (hasMatchInArray) return true;
                }
                
                // Check in genre string
                if (book.genre && typeof book.genre === 'string') {
                  if (book.genre.toLowerCase().includes(cat)) {
                    return true;
                  }
                }
                
                return false;
              });
            });
          }
          
          // Apply other filters
          if (genres && genres.length > 0) {
            filteredBooks = filteredBooks.filter(b => {
              if (!b.genre) return false;
              return genres.some(g => b.genre.toLowerCase().includes(g.toLowerCase()));
            });
          }
          
          if (year) {
            filteredBooks = filteredBooks.filter(b => {
              const bookYear = b.published_date ? new Date(b.published_date).getFullYear() : undefined;
              return bookYear === year;
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
        }, 500); // Simulate API delay
      } else {
        // REAL SUPABASE QUERY
        console.log('🔍 USING SUPABASE with categories:', categories);
        
        // Start basic query
        let query = supabase.from('books').select('*', { count: 'exact' });
        
        // Apply basic filters
        if (type) {
          console.log('Filtering by type:', type);
          query = query.eq('type', type);
        }
        
        if (year) {
          console.log('Filtering by year:', year);
          query = query.filter('published_date', 'gte', `${year}-01-01`)
                       .filter('published_date', 'lte', `${year}-12-31`);
        }
        
        // Add file type filtering
        if (fileType) {
          console.log('Filtering by file format:', fileType);
          // Need to check both ebook_format and audio_format fields
          query = query.or(`ebook_format.ilike.%${fileType}%,audio_format.ilike.%${fileType}%`);
        }
        
        if (searchTerm) {
          console.log('Filtering by search term:', searchTerm);
          query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        
        // ⭐️ CRITICAL FIX: CATEGORY FILTERING ⭐️
        if (categories && categories.length > 0) {
          console.log('🎯 APPLYING CATEGORY FILTERS:', categories);
          
          // For each category, create filter conditions
          let categoryFilters: string[] = [];
          
          for (const category of categories) {
            const cat = category.toLowerCase().trim();
            console.log(`Processing category: "${cat}"`);
            
            // Add both ways to match categories: in genre string or categories array
            categoryFilters.push(`genre.ilike.%${cat}%`);
            categoryFilters.push(`categories.cs.{"${cat}"}`);
          }
          
          // Use OR logic between all filter conditions
          if (categoryFilters.length > 0) {
            const filterStr = categoryFilters.join(',');
            console.log('🔍 Combined filter:', filterStr);
            query = query.or(filterStr);
          }
        }
        
        // Apply pagination
        const from = page * limit;
        const to = from + limit - 1;
        console.log(`Pagination: ${from}-${to}`);
        
        // Execute query
        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(from, to);
        
        if (error) {
          console.error('SUPABASE ERROR:', error);
          throw error;
        }
        
        // 🚨 CRITICAL: USE DATA DIRECTLY, NO JAVASCRIPT FILTERING
        const fetchedBooks = data || [];
        
        console.log(`✅ SUCCESS: Got ${fetchedBooks.length} books matching filters`);
        if (fetchedBooks.length > 0) {
          console.log('📚 First book:', fetchedBooks[0].title);
          console.log('   - Categories:', fetchedBooks[0].categories);
          console.log('   - Genre:', fetchedBooks[0].genre);
        }
        
        setBooks(fetchedBooks);
        setTotalCount(count || fetchedBooks.length);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch books'));
      setIsLoading(false);
    }
  };
  
  // Run fetchBooks whenever any filter changes
  useEffect(() => {
    console.log('Filters changed, fetching books with categories:', categories);
    fetchBooks();
  }, [type, searchTerm, genres, year, page, categories, limit]);
  
  return { books, isLoading, error, totalCount, fetchBooks };
};

// Single book hook - for book details page
interface UseBookResult {
  book: Book | null;
  isLoading: boolean;
  error: Error | null;
}

export const useBook = (id: string): UseBookResult => {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchBook = async () => {
      if (!id) {
        setBook(null);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (!supabaseAvailable) {
          // If Supabase is not available, return first mock book
          setBook(mockBooks[0]);
          setIsLoading(false);
          return;
        }
        
        // Fetch the book by ID
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          throw error;
        }
        
        setBook(data || null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching book:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch book'));
        setIsLoading(false);
      }
    };
    
    fetchBook();
  }, [id]);
  
  return { book, isLoading, error };
};

// Related books hook
interface UseRelatedBooksProps {
  bookId?: string;
  limit?: number;
}

interface UseRelatedBooksResult {
  relatedBooks: Book[];
  isLoading: boolean;
  error: Error | null;
}

export const useRelatedBooks = ({
  bookId,
  limit = 6
}: UseRelatedBooksProps = {}): UseRelatedBooksResult => {
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchRelatedBooks = async () => {
      if (!bookId) {
        setRelatedBooks([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (!supabaseAvailable) {
          // If Supabase is not available, return mock data
          setRelatedBooks(mockBooks.slice(0, limit));
          setIsLoading(false);
          return;
        }
        
        // First get the current book to use its genre for related books
        const { data: book } = await supabase
          .from('books')
          .select('*')
          .eq('id', bookId)
          .single();
        
        if (!book) {
          throw new Error('Book not found');
        }
        
        // Extract keywords from the book title for better matching
        const keywords = extractKeywords(book.title);
        const genreParts = book.genre ? book.genre.split(/[>\s,/&]+/).map((p: string) => p.trim()).filter(Boolean) : [];
        
        // Get related books by genre and keywords, excluding the current book
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .neq('id', bookId)
          .or(
            keywords.map(k => `title.ilike.%${k}%`).join(',') +
            (genreParts.length > 0 ? ',' + genreParts.map((g: string) => `genre.ilike.%${g}%`).join(',') : '')
          )
          .limit(limit);
        
        if (error) {
          throw error;
        }
        
        setRelatedBooks(data || []);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching related books:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch related books'));
        setIsLoading(false);
      }
    };
    
    fetchRelatedBooks();
  }, [bookId, limit]);
  
  return { relatedBooks, isLoading, error };
};

// Helper function to extract keywords from a title
function extractKeywords(title: string): string[] {
  if (!title) return [];
  
  const stopWords = ['der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'für', 'mit', 'von', 'zu', 'in', 'an', 'auf'];
  
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
}
