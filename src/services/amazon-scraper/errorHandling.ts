/**
 * Error handling and validation module for Amazon Book Scraper
 * Browser-compatible implementation
 */

/**
 * Custom error class for Amazon scraper errors
 */
export class AmazonScraperError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AmazonScraperError';
    this.code = code;
  }
}

/**
 * Validates the book data to ensure all required fields are present
 */
export function validateBookData(bookData: any): { isValid: boolean; missingFields: string[] } {
  const requiredFields = [
    'title',
    'author',
    'asin'
  ];
  
  const missingFields = requiredFields.filter(field => 
    !bookData[field] || bookData[field].toString().trim() === ''
  );
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Attempts to fix common issues with book data
 */
export function fixBookData(bookData: any): any {
  const fixedData = { ...bookData };
  
  // Fix empty cover URL with a placeholder
  if (!fixedData.cover_url || fixedData.cover_url.trim() === '') {
    fixedData.cover_url = 'https://via.placeholder.com/150x225?text=No+Cover';
  }
  
  // Ensure page count is a number or null
  if (fixedData.page_count && isNaN(parseInt(fixedData.page_count))) {
    fixedData.page_count = null;
  }
  
  // Set default language if missing
  if (!fixedData.language || fixedData.language.trim() === '') {
    fixedData.language = 'German';
  }
  
  // Set default type if missing
  if (!fixedData.type || fixedData.type.trim() === '') {
    fixedData.type = 'ebook';
  }
  
  // Ensure publication_date is in a consistent format if present
  if (fixedData.published_date && fixedData.published_date.trim() !== '') {
    try {
      // Try to parse and format the date
      const dateObj = new Date(fixedData.published_date);
      if (!isNaN(dateObj.getTime())) {
        fixedData.published_date = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    } catch (error) {
      // If date parsing fails, keep the original value
      console.warn('Could not parse publication date:', fixedData.published_date);
    }
  }
  
  return fixedData;
}

/**
 * Adds delay between requests
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handles retries for fetching book data
 */
export async function withRetry<T>(
  fetchFn: (url: string) => Promise<T>, 
  url: string, 
  maxRetries = 3, 
  retryDelay = 2000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} to fetch data from ${url}`);
      const data = await fetchFn(url);
      return data;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (attempt < maxRetries) {
        // Wait longer between each retry
        const waitTime = retryDelay * attempt;
        console.log(`Waiting ${waitTime}ms before next attempt...`);
        await delay(waitTime);
      }
    }
  }
  
  // If we get here, all retries failed
  throw new AmazonScraperError(
    `Failed to fetch book data after ${maxRetries} attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`,
    'FETCH_FAILED'
  );
}
