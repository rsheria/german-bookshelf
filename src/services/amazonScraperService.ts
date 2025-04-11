/**
 * amazonScraperService.ts
 * 
 * Enhanced implementation of Amazon book data extraction using
 * a dedicated Node.js scraper service with Puppeteer.
 */

import axios from 'axios';
import { Book } from '../types/supabase';

// URL of the scraper server
const SCRAPER_API_URL = import.meta.env.VITE_AMAZON_SCRAPER_URL || 'http://localhost:3333/api/scrape';

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

/**
 * Checks if a URL is a valid Amazon URL
 */
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

/**
 * Extracts ASIN from an Amazon URL
 */
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

/**
 * Main function to extract book data from Amazon URL
 * Uses the dedicated scraper service
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

    // Call the scraper API
    try {
      const response = await axios.post(SCRAPER_API_URL, { url: amazonUrl });
      
      if (response.status !== 200 || !response.data) {
        throw new AmazonScraperError('Failed to fetch book data from scraper service', 'SERVICE_ERROR');
      }
      
      // Destructure only what we need
      const { bookData } = response.data;
      
      // Convert to the old format for backward compatibility
      return {
        title: bookData.title || 'Unknown Title',
        author: bookData.author || 'Unknown Author',
        description: bookData.description || 'Please enter a description.',
        coverUrl: bookData.cover_url || '',
        language: bookData.language || 'German',
        genre: bookData.categories || 'Fiction',
        type: bookData.type || 'ebook',
        isbn: bookData.isbn || '',
        asin: bookData.asin || asin,
        pageCount: bookData.page_count,
        publishedDate: bookData.publication_date,
        publisher: bookData.publisher
      };
    } catch (error) {
      console.error('Scraper service error:', error);
      throw new AmazonScraperError(
        'Scraper service error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        'SERVICE_ERROR'
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
