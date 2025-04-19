import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Book, BookType } from '../types/supabase';

// Static default arrays to prevent new references per call
const DEFAULT_GENRES: string[] = [];
const DEFAULT_CATEGORIES: string[] = [];

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
  genres = DEFAULT_GENRES,
  year = null,
  limit = 12,
  page = 0,
  categories = DEFAULT_CATEGORIES,
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
            filteredBooks = filteredBooks.filter(book =>
              categories.every(category => {
                const cat = category.toLowerCase().trim();
                
                // Check in categories array
                if (book.categories && Array.isArray(book.categories)) {
                  const hasInArray = book.categories.some(bookCat =>
                    typeof bookCat === 'string' && bookCat.toLowerCase().includes(cat)
                  );
                  if (hasInArray) return true;
                }
                
                // Check in genre string
                if (book.genre && typeof book.genre === 'string') {
                  if (book.genre.toLowerCase().includes(cat)) {
                    return true;
                  }
                }
                
                return false;
              })
            );
          }
          
          // Apply other filters
          if (genres && genres.length > 0) {
            filteredBooks = filteredBooks.filter(b =>
              b.genre ? genres.some(g => b.genre.toLowerCase().includes(g.toLowerCase())) : false
            );
          }
          
          if (year) {
            filteredBooks = filteredBooks.filter(b => {
              const bookYear = b.published_date
                ? new Date(b.published_date).getFullYear()
                : undefined;
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
          const paginated = filteredBooks.slice(from, to);
          
          setBooks(paginated);
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
          query = query
            .filter('published_date', 'gte', `${year}-01-01`)
            .filter('published_date', 'lte', `${year}-12-31`);
        }
        
        // Add file type filtering
        if (fileType) {
          console.log('Filtering by file format:', fileType);
          query = query.or(
            `ebook_format.ilike.%${fileType}%,audio_format.ilike.%${fileType}%`
          );
        }
        
        // ─── Advanced search syntax support ───
        if (searchTerm) {
          console.log('Filtering by search term:', searchTerm);
          const advancedQueries = searchTerm.match(/(\w+):(?:"([^"]+)"|([^\s]+))/g);
          
          if (advancedQueries) {
            // Extract the remaining text that isn't part of advanced queries
            let basicSearchTerm = searchTerm;
            advancedQueries.forEach(q => {
              basicSearchTerm = basicSearchTerm.replace(q, '').trim();
            });
            
            // Build advanced query conditions
            const advancedConditions: string[] = [];
            advancedQueries.forEach(match => {
              const [field, ...valueParts] = match.split(':');
              let value = valueParts.join(':');
              
              // Remove quotes if present
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              }
              
              // Add specific field conditions
              switch (field.toLowerCase()) {
                case 'publisher':
                  // Sanitize publisher value and log for debugging
                  const sanitizedPublisher = value.replace(/[\u200E\u200F\u2028\u2029]/g, '').trim();
                  console.log('Searching for publisher:', sanitizedPublisher);
                  advancedConditions.push(`publisher.ilike.%${sanitizedPublisher}%`);
                  break;
                case 'narrator':
                  // Sanitize narrator value and log for debugging
                  const sanitizedNarrator = value.replace(/[\u200E\u200F\u2028\u2029]/g, '').trim();
                  console.log('Searching for narrator:', sanitizedNarrator);
                  advancedConditions.push(`narrator.ilike.%${sanitizedNarrator}%`);
                  break;
                case 'year':
                  const y = parseInt(value, 10);
                  if (!isNaN(y)) {
                    advancedConditions.push(`published_date.gte.${y}-01-01`);
                    advancedConditions.push(`published_date.lte.${y}-12-31`);
                  }
                  break;
                case 'language':
                  advancedConditions.push(`language.eq.${value}`);
                  break;
                case 'format':
                  advancedConditions.push(
                    `ebook_format.ilike.%${value}%,audio_format.ilike.%${value}%`
                  );
                  break;
                case 'genre':
                case 'category':
                  advancedConditions.push(`genre.ilike.%${value}%`);
                  advancedConditions.push(`categories.cs.{"${value}"}`);
                  break;
                default:
                  // Unknown fields: search across title, author, description
                  advancedConditions.push(
                    `title.ilike.%${match}%,author.ilike.%${match}%,description.ilike.%${match}%`
                  );
                  break;
              }
            });
            
            // Apply basic search term if any
            if (basicSearchTerm) {
              query = query.or(
                `title.ilike.%${basicSearchTerm}%` +
                `,author.ilike.%${basicSearchTerm}%` +
                `,description.ilike.%${basicSearchTerm}%`
              );
            }
            
            // Apply advanced conditions
            advancedConditions.forEach(condition => {
              if (condition.includes(',')) {
                console.log('Applying OR condition:', condition);
                query = query.or(condition);
              } else {
                const [f, op, ...rest] = condition.split('.');
                const val = rest.join('.');
                console.log(`Applying filter: ${f} ${op} ${val}`);
                query = query.filter(f, op, val);
              }
            });
          } else {
            // Standard search if no advanced syntax
            query = query.or(
              `title.ilike.%${searchTerm}%` +
              `,author.ilike.%${searchTerm}%` +
              `,description.ilike.%${searchTerm}%`
            );
          }
        }
        // ───────────────────────────────────────
        
        // ⭐️ CATEGORY FILTERING ⭐️
        if (categories && categories.length > 0) {
          console.log('🎯 APPLYING CATEGORY FILTERS:', categories);
          const categoryFilters: string[] = [];
          
          for (const category of categories) {
            const cat = category.toLowerCase().trim();
            categoryFilters.push(`genre.ilike.%${cat}%`);
            categoryFilters.push(`categories.cs.{"${cat}"}`);
          }
          
          if (categoryFilters.length) {
            const filterStr = categoryFilters.join(',');
            console.log('🔍 Combined filter:', filterStr);
            query = query.or(filterStr);
          }
        }
        
        // Pagination
        const from = page * limit;
        const to = from + limit - 1;
        console.log(`Pagination: ${from}-${to}`);
        
        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(from, to);
        
        if (error) {
          console.error('SUPABASE ERROR:', error);
          throw error;
        }
        
        const fetchedBooks = data || [];
        console.log(`✅ SUCCESS: Got ${fetchedBooks.length} books matching filters`);
        
        setBooks(fetchedBooks);
        setTotalCount(count ?? fetchedBooks.length);
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
          setBook(mockBooks[0]);
          setIsLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
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
          setRelatedBooks(mockBooks.slice(0, limit));
          setIsLoading(false);
          return;
        }
        
        const { data: book } = await supabase
          .from('books')
          .select('*')
          .eq('id', bookId)
          .single();
        
        if (!book) throw new Error('Book not found');
        
        const keywords = extractKeywords(book.title);
        const genreParts = book.genre
          ? book.genre.split(/[>\s,/&]+/).map((p: string) => p.trim()).filter(Boolean)
          : [];
        
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .neq('id', bookId)
          .or(
            [
              ...keywords.map(k => `title.ilike.%${k}%`),
              ...genreParts.map((g: string) => `genre.ilike.%${g}%`)
            ].join(',')
          )
          .limit(limit);
        
        if (error) throw error;
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
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
}
