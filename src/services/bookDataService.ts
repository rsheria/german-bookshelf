/**
 * Book Data Service
 * 
 * A comprehensive service for retrieving book data from multiple sources:
 * - Google Books API
 * - Open Library API
 * - Deutsche Nationalbibliothek API
 * - ISBNdb (optional)
 * 
 * This service includes fallback mechanisms to maximize data availability
 * for German books, and can extract ISBNs from Amazon URLs as well.
 */

import { Book } from '../types/supabase';
import axios from 'axios';

interface BookApiData {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  language: string;
  genre: string; 
  type: 'audiobook' | 'ebook';
  isbn: string;
  asin?: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
}

// Helper function to extract ISBN from Amazon URL
export const extractIsbnFromAmazonUrl = async (amazonUrl: string): Promise<string | null> => {
  try {
    // First try to extract ASIN
    const asin = extractAsinFromUrl(amazonUrl);
    if (!asin) return null;
    
    // Then use the ASIN to look up the ISBN via Google Books
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=asin:${asin}&langRestrict=de`);
    
    if (response.data.items && response.data.items.length > 0) {
      const identifiers = response.data.items[0]?.volumeInfo?.industryIdentifiers || [];
      const isbnItem = identifiers.find((id: any) => id.type === 'ISBN_13' || id.type === 'ISBN_10');
      
      if (isbnItem) {
        return isbnItem.identifier;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting ISBN from Amazon URL:', error);
    return null;
  }
};

// Helper function to extract ASIN from Amazon URL
export const extractAsinFromUrl = (url: string): string | null => {
  // Try different URL patterns
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/asin\/([A-Z0-9]{10})/i,
    /\/([A-Z0-9]{10})(?:\/|\?|$)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Check if a URL is a valid Amazon URL
export const isValidAmazonUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.hostname === 'www.amazon.de' || 
       urlObj.hostname === 'amazon.de') &&
      (urlObj.pathname.includes('/dp/') || 
       urlObj.pathname.includes('/gp/product/'))
    );
  } catch (error) {
    return false;
  }
};

// Fetch book data from Google Books API
const fetchFromGoogleBooks = async (isbn: string): Promise<BookApiData | null> => {
  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&langRestrict=de`);
    
    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }
    
    const book = response.data.items[0];
    const volumeInfo = book.volumeInfo;
    
    if (!volumeInfo) {
      return null;
    }
    
    // Extract industry identifiers
    const identifiers = volumeInfo.industryIdentifiers || [];
    const isbn13 = identifiers.find((id: any) => id.type === 'ISBN_13')?.identifier;
    const isbn10 = identifiers.find((id: any) => id.type === 'ISBN_10')?.identifier;
    
    return {
      title: volumeInfo.title || 'Unknown Title',
      author: (volumeInfo.authors || []).join(', ') || 'Unknown Author',
      description: volumeInfo.description || 'No description available',
      coverUrl: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || '',
      language: volumeInfo.language || 'de',
      genre: (volumeInfo.categories || []).join(', ') || 'Fiction',
      type: 'ebook', // Default to ebook
      isbn: isbn13 || isbn10 || isbn,
      pageCount: volumeInfo.pageCount || undefined,
      publishedDate: volumeInfo.publishedDate || '',
      publisher: volumeInfo.publisher || ''
    };
  } catch (error) {
    console.error('Error fetching from Google Books:', error);
    return null;
  }
};

// Fetch book data from Open Library
const fetchFromOpenLibrary = async (isbn: string): Promise<BookApiData | null> => {
  try {
    const response = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    
    const bookData = response.data[`ISBN:${isbn}`];
    if (!bookData) {
      return null;
    }
    
    return {
      title: bookData.title || 'Unknown Title',
      author: bookData.authors?.[0]?.name || 'Unknown Author',
      description: bookData.notes || bookData.excerpts?.[0]?.text || 'No description available',
      coverUrl: bookData.cover?.large || bookData.cover?.medium || bookData.cover?.small || '',
      language: bookData.language || 'german',
      genre: bookData.subjects?.map((s: any) => s.name).join(', ') || 'Fiction',
      type: 'ebook',
      isbn: isbn,
      pageCount: bookData.number_of_pages || undefined,
      publishedDate: bookData.publish_date || '',
      publisher: bookData.publishers?.[0]?.name || ''
    };
  } catch (error) {
    console.error('Error fetching from Open Library:', error);
    return null;
  }
};

// Fetch from Deutsche Nationalbibliothek (DNB)
const fetchFromDNB = async (isbn: string): Promise<BookApiData | null> => {
  try {
    // Use the SRU API (Search/Retrieve via URL)
    const response = await axios.get(
      `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=isbn=${isbn}&recordSchema=MARC21-xml`
    );
    
    // DNB returns XML, so we need to parse it
    const xmlData = response.data;
    
    // Simple XML parsing using string operations for demonstration
    // In a production app, use a proper XML parser
    if (!xmlData.includes('<recordData>')) {
      return null;
    }
    
    const title = extractXmlValue(xmlData, 'datafield tag="245"', 'subfield code="a"') || 'Unknown Title';
    const author = extractXmlValue(xmlData, 'datafield tag="100"', 'subfield code="a"') || 'Unknown Author';
    const publisher = extractXmlValue(xmlData, 'datafield tag="260"', 'subfield code="b"') || '';
    const publishedDate = extractXmlValue(xmlData, 'datafield tag="260"', 'subfield code="c"') || '';
    const pageCount = extractXmlValue(xmlData, 'datafield tag="300"', 'subfield code="a"');
    const pages = pageCount ? parseInt(pageCount.match(/\d+/)?.[0] || '0') : undefined;
    
    return {
      title,
      author,
      description: 'No description available', // DNB doesn't typically provide descriptions
      coverUrl: '', // DNB doesn't provide cover images
      language: 'german',
      genre: '',
      type: 'ebook',
      isbn: isbn,
      pageCount: pages,
      publishedDate,
      publisher
    };
  } catch (error) {
    console.error('Error fetching from DNB:', error);
    return null;
  }
};

// Helper function to extract values from XML
const extractXmlValue = (xml: string, fieldTag: string, subfieldTag: string): string | null => {
  const fieldRegex = new RegExp(`<${fieldTag}[^>]*>(.*?)<\\/datafield>`, 's');
  const fieldMatch = xml.match(fieldRegex);
  
  if (fieldMatch && fieldMatch[1]) {
    const subfieldRegex = new RegExp(`<${subfieldTag}[^>]*>(.*?)<\\/subfield>`, 's');
    const subfieldMatch = fieldMatch[1].match(subfieldRegex);
    
    if (subfieldMatch && subfieldMatch[1]) {
      return subfieldMatch[1].trim();
    }
  }
  
  return null;
};

// Main function to get book data from any source
export const getBookData = async (input: string): Promise<BookApiData | null> => {
  let isbn: string | null = null;
  let asin: string | null = null;
  
  // Check if input is an ISBN
  if (/^[0-9]{10,13}$/.test(input)) {
    isbn = input;
  } 
  // Check if input is an Amazon URL
  else if (isValidAmazonUrl(input)) {
    asin = extractAsinFromUrl(input);
    isbn = await extractIsbnFromAmazonUrl(input);
  } 
  else {
    throw new Error('Invalid input: Please provide either an ISBN or an Amazon URL');
  }
  
  // If we couldn't get an ISBN, but have an ASIN, create basic data
  if (!isbn && asin) {
    return {
      title: `Book with ASIN: ${asin}`,
      author: 'Unknown Author',
      description: 'No description available',
      coverUrl: `https://m.media-amazon.com/images/I/${asin}.jpg`,
      language: 'german',
      genre: '',
      type: 'ebook',
      isbn: '',
      asin: asin
    };
  }
  
  if (!isbn) {
    throw new Error('Could not extract ISBN from input');
  }
  
  // Try all sources in order
  const googleBooksData = await fetchFromGoogleBooks(isbn);
  if (googleBooksData) {
    if (asin) googleBooksData.asin = asin;
    return googleBooksData;
  }
  
  const openLibraryData = await fetchFromOpenLibrary(isbn);
  if (openLibraryData) {
    if (asin) openLibraryData.asin = asin;
    return openLibraryData;
  }
  
  const dnbData = await fetchFromDNB(isbn);
  if (dnbData) {
    if (asin) dnbData.asin = asin;
    return dnbData;
  }
  
  // If all APIs fail and we have an ISBN, return minimal data
  return {
    title: `Book with ISBN: ${isbn}`,
    author: 'Unknown Author',
    description: 'Could not retrieve book data from any source',
    coverUrl: '',
    language: 'german',
    genre: '',
    type: 'ebook',
    isbn: isbn,
    asin: asin || undefined
  };
};

// Convert API book data to your application Book model
export const apiDataToBook = (apiData: BookApiData): Partial<Book> => {
  return {
    title: apiData.title,
    author: apiData.author,
    description: apiData.description,
    cover_url: apiData.coverUrl,
    language: apiData.language,
    genre: apiData.genre,
    type: apiData.type,
    isbn: apiData.isbn,
    external_id: apiData.asin || '',
    page_count: apiData.pageCount,
    published_date: apiData.publishedDate,
    publisher: apiData.publisher,
  };
};
