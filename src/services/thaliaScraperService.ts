/**
 * thaliaScraperService.ts
 * 
 * Enhanced implementation using multiple book data APIs
 * to reliably fetch German book data from Thalia URLs or ISBNs.
 */

import { Book } from '../types/supabase';
import { isValidThaliaUrl, extractEanFromUrl } from './bookDataService';

// Define the fields we need to extract from Thalia (for backwards compatibility)
export interface ThaliaBookData {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  language: string;
  genre: string;
  type: 'audiobook' | 'ebook';
  isbn: string;
  ean?: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
}

// Custom error class for scraper errors
export class ThaliaScraperError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ThaliaScraperError';
    this.code = code;
  }
}

// Re-export the functions from bookDataService
export { isValidThaliaUrl, extractEanFromUrl };

/**
 * Main function to extract book data from Thalia URL or ISBN
 * Uses multiple book data APIs for reliable results
 */
export const fetchBookDataFromThalia = async (thaliaUrl: string): Promise<ThaliaBookData | null> => {
  try {
    if (!isValidThaliaUrl(thaliaUrl)) {
      throw new ThaliaScraperError('Invalid Thalia URL', 'INVALID_URL');
    }

    const ean = extractEanFromUrl(thaliaUrl);
    if (!ean) {
      throw new ThaliaScraperError('Could not extract EAN from URL', 'INVALID_EAN');
    }

    try {
      // Get the API URL from environment variables
      const apiUrl = import.meta.env.VITE_THALIA_SCRAPER_URL;
      console.log('Using Thalia scraper API URL:', apiUrl);
      
      // Call the API directly instead of using book data service
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: thaliaUrl }),
      });
      
      // Log the raw response for debugging
      const rawData = await response.text();
      console.log('Raw API response:', rawData);
      
      // Parse the JSON response
      let data;
      try {
        data = JSON.parse(rawData);
        console.log('Parsed API response:', data);
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        throw new ThaliaScraperError('Invalid response from API', 'PARSE_ERROR');
      }
      
      // Handle different response formats (direct data or nested under bookData)
      let bookData;
      if (data.success && data.bookData) {
        // Response format: { success: true, bookData: { ... } }
        bookData = data.bookData;
      } else if (data.title !== undefined) {
        // Response format: direct object { title: "...", author: "...", ... }
        bookData = data;
      } else {
        console.error('Unexpected API response structure:', data);
        throw new ThaliaScraperError('Unexpected response format from API', 'FORMAT_ERROR');
      }
      
      if (!bookData) {
        throw new ThaliaScraperError('Failed to fetch book data', 'DATA_ERROR');
      }
      
      // Convert to the expected format for backward compatibility
      return {
        title: bookData.title || 'Unknown Title',
        author: bookData.author || 'Unknown Author',
        description: bookData.description || 'Please enter a description.',
        coverUrl: bookData.coverUrl || '',
        language: bookData.language || 'German',
        genre: bookData.genre || 'Fiction',
        type: bookData.type || 'ebook',
        isbn: bookData.isbn || '',
        ean: bookData.ean || ean,
        pageCount: bookData.pageCount ? Number(bookData.pageCount) : undefined,
        publishedDate: bookData.publishedDate || bookData.publicationDate,
        publisher: bookData.publisher
      };
    } catch (error) {
      console.error('Book data API error:', error);
      throw new ThaliaScraperError(
        'Book data API error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        'API_ERROR'
      );
    }
  } catch (error) {
    // If it's already a ThaliaScraperError, just re-throw it
    if (error instanceof ThaliaScraperError) {
      throw error;
    }
    
    // Otherwise wrap in a scraper error
    console.error('Error extracting Thalia book data:', error);
    throw new ThaliaScraperError(
      'Failed to fetch book data: ' + (error instanceof Error ? error.message : 'Unknown error'),
      'UNKNOWN_ERROR'
    );
  }
};

/**
 * Helper function to convert Thalia book data to our Book model
 */
export const thaliaDataToBook = (thaliaData: ThaliaBookData): Partial<Book> => {
  return {
    title: thaliaData.title,
    author: thaliaData.author,
    description: thaliaData.description,
    cover_url: thaliaData.coverUrl,
    language: thaliaData.language,
    genre: thaliaData.genre,
    type: thaliaData.type,
    isbn: thaliaData.isbn,
    external_id: thaliaData.ean,
    page_count: thaliaData.pageCount,
    published_date: thaliaData.publishedDate,
    publisher: thaliaData.publisher,
  };
};
