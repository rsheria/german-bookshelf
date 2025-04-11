/**
 * amazonScraperService.ts
 * 
 * Enhanced implementation using multiple book data APIs
 * to reliably fetch German book data from Amazon URLs or ISBNs.
 */

import { Book } from '../types/supabase';
import { getBookData, isValidAmazonUrl, extractAsinFromUrl } from './bookDataService';

// Define the fields we need to extract from Amazon (for backwards compatibility)
export interface AmazonBookData {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  language: string;
  genre: string;
  type: 'audiobook' | 'ebook';
  isbn: string;
  asin: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
}

// Custom error class for scraper errors
export class AmazonScraperError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AmazonScraperError';
    this.code = code;
  }
}

// Re-export the functions from bookDataService
export { isValidAmazonUrl, extractAsinFromUrl };

/**
 * Main function to extract book data from Amazon URL or ISBN
 * Uses multiple book data APIs for reliable results
 */
export const fetchBookDataFromAmazon = async (amazonUrl: string): Promise<AmazonBookData | null> => {
  try {
    if (!isValidAmazonUrl(amazonUrl)) {
      throw new AmazonScraperError('Invalid Amazon URL', 'INVALID_URL');
    }

    const asin = extractAsinFromUrl(amazonUrl);
    if (!asin) {
      throw new AmazonScraperError('Could not extract ASIN from URL', 'INVALID_ASIN');
    }

    try {
      // Use the new book data service
      const bookData = await getBookData(amazonUrl);
      
      if (!bookData) {
        throw new AmazonScraperError('Failed to fetch book data', 'DATA_ERROR');
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
        asin: bookData.asin || asin,
        pageCount: bookData.pageCount,
        publishedDate: bookData.publishedDate,
        publisher: bookData.publisher
      };
    } catch (error) {
      console.error('Book data API error:', error);
      throw new AmazonScraperError(
        'Book data API error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        'API_ERROR'
      );
    }
  } catch (error) {
    // If it's already an AmazonScraperError, just re-throw it
    if (error instanceof AmazonScraperError) {
      throw error;
    }
    
    // Otherwise wrap in a scraper error
    console.error('Error extracting Amazon book data:', error);
    throw new AmazonScraperError(
      'Failed to fetch book data: ' + (error instanceof Error ? error.message : 'Unknown error'),
      'UNKNOWN_ERROR'
    );
  }
};

/**
 * Helper function to convert Amazon book data to our Book model
 */
export const amazonDataToBook = (amazonData: AmazonBookData): Partial<Book> => {
  return {
    title: amazonData.title,
    author: amazonData.author,
    description: amazonData.description,
    cover_url: amazonData.coverUrl,
    language: amazonData.language,
    genre: amazonData.genre,
    type: amazonData.type,
    isbn: amazonData.isbn,
    external_id: amazonData.asin,
    page_count: amazonData.pageCount,
    published_date: amazonData.publishedDate,
    publisher: amazonData.publisher,
  };
};
