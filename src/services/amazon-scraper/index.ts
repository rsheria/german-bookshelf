/**
 * Integration of the Amazon Book Scraper with error handling
 * Browser-compatible implementation
 */

import { 
  isValidAmazonUrl, 
  fetchBookDataFromAmazon as fetchBookDataRaw, 
  amazonDataToBook,
  AmazonBookData
} from './amazonScraper';

import {
  AmazonScraperError,
  validateBookData,
  fixBookData,
  withRetry
} from './errorHandling';

import { Book } from '../../types/supabase';

/**
 * Enhanced version of fetchBookDataFromAmazon with retry and error handling
 */
export async function fetchBookDataFromAmazon(url: string, options: {
  maxRetries?: number;
  retryDelay?: number;
  validateData?: boolean;
  fixData?: boolean;
} = {}): Promise<{
  rawData: AmazonBookData;
  bookData: Partial<Book>;
}> {
  const { 
    maxRetries = 3, 
    retryDelay = 2000,
    validateData = true,
    fixData = true
  } = options;
  
  // Validate URL
  if (!isValidAmazonUrl(url)) {
    throw new AmazonScraperError('Invalid Amazon URL', 'INVALID_URL');
  }
  
  try {
    // Fetch data with retry mechanism
    const amazonData = await withRetry(fetchBookDataRaw, url, maxRetries, retryDelay);
    
    if (!amazonData) {
      throw new AmazonScraperError('No data returned from Amazon', 'NO_DATA');
    }
    
    // Convert to application format
    let bookData = amazonDataToBook(amazonData);
    
    // Fix common issues if requested
    if (fixData) {
      bookData = fixBookData(bookData);
    }
    
    // Validate data if requested
    if (validateData) {
      const validation = validateBookData(bookData);
      if (!validation.isValid) {
        throw new AmazonScraperError(
          `Book data validation failed. Missing required fields: ${validation.missingFields.join(', ')}`,
          'VALIDATION_FAILED'
        );
      }
    }
    
    return {
      rawData: amazonData,
      bookData: bookData
    };
  } catch (error) {
    // Wrap non-AmazonScraperError errors
    if (!(error instanceof AmazonScraperError)) {
      throw new AmazonScraperError(
        `Error fetching book data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FETCH_ERROR'
      );
    }
    throw error;
  }
}

// Export all necessary functions and types
export { isValidAmazonUrl, amazonDataToBook, AmazonScraperError };
export type { AmazonBookData };
