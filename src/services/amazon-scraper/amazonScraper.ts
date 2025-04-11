/**
 * Amazon Book Scraper core functionality
 * Adapted for browser environment
 */

import { Book } from '../../types/supabase';
import { scrapeAmazonPage } from './browser-scraper';

/**
 * Validates if the provided URL is a valid Amazon.de book URL
 */
export function isValidAmazonUrl(url: string): boolean {
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
}

/**
 * Extracts the ASIN from an Amazon URL
 */
export function extractAsinFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Extract ASIN from /dp/ASIN or /gp/product/ASIN pattern
    const dpMatch = pathname.match(/\/dp\/([A-Z0-9]{10})/);
    if (dpMatch) return dpMatch[1];
    
    const gpMatch = pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);
    if (gpMatch) return gpMatch[1];
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Book data interface returned from Amazon scraping
 */
export interface AmazonBookData {
  title: string;
  authors: string[];
  description: string;
  coverUrl: string;
  language: string;
  categories: string[];
  type: 'audiobook' | 'ebook';
  isbn: string;
  isbn13: string;
  asin: string;
  pageCount?: string;
  publicationDate?: string;
  publisher?: string;
  price?: string;
}

/**
 * Browser-compatible implementation for fetching Amazon book data
 */
export async function fetchBookDataFromAmazon(amazonUrl: string): Promise<AmazonBookData | null> {
  if (!isValidAmazonUrl(amazonUrl)) {
    throw new Error('Invalid Amazon URL');
  }

  const asin = extractAsinFromUrl(amazonUrl);
  if (!asin) {
    throw new Error('Could not extract ASIN from URL');
  }

  try {
    // Use the browser-scraper implementation
    return await scrapeAmazonPage(amazonUrl);
  } catch (error) {
    console.error('Error fetching book data:', error);
    // Fallback to basic data extraction if scraping fails
    return fallbackToBasicData(amazonUrl, asin);
  }
}

/**
 * Fallback method to extract basic book data from URL and image API
 * Used when the scraping fails
 */
async function fallbackToBasicData(url: string, asin: string): Promise<AmazonBookData> {
  // Extract title from URL
  const decodedUrl = decodeURIComponent(url);
  let title = 'Unknown Title';
  const titleMatch = decodedUrl.match(/\/([^\/]+)\/dp\//);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  
  // Determine book type
  const type: 'audiobook' | 'ebook' = url.toLowerCase().includes('audible') ? 'audiobook' : 'ebook';
  
  // Generate cover image URL
  const coverUrl = `https://m.media-amazon.com/images/P/${asin}.jpg`;
  
  // Return basic data
  return {
    title,
    authors: ['Please add author'],
    description: 'Please add description',
    coverUrl,
    language: 'German',
    categories: [],
    type,
    isbn: '',
    isbn13: '',
    asin,
    pageCount: '',
    publicationDate: '',
    publisher: ''
  };
}

/**
 * Converts Amazon book data to the application's book format
 */
export function amazonDataToBook(amazonData: AmazonBookData): Partial<Book> {
  return {
    title: amazonData.title || '',
    author: amazonData.authors.join(', ') || '',
    description: amazonData.description || '',
    cover_url: amazonData.coverUrl || '',
    language: amazonData.language || 'German',
    genre: amazonData.categories.join(', ') || '',
    type: amazonData.type || 'ebook',
    isbn: amazonData.isbn13 || amazonData.isbn || '',
    external_id: amazonData.asin || '',
    page_count: amazonData.pageCount ? parseInt(amazonData.pageCount, 10) : undefined,
    published_date: amazonData.publicationDate || '',
    publisher: amazonData.publisher || '',
  };
}
