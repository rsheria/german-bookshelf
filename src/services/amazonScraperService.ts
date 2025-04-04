/**
 * amazonScraperService.ts
 * 
 * This service handles the extraction of book data from Amazon product URLs.
 * Instead of scraping (which is blocked by CORS), it uses Amazon's URL patterns
 * and the reliable Amazon image API to provide basic automation.
 */

import axios from 'axios';
import { Book } from '../types/supabase';

// Define the fields we need to extract from Amazon
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

// Extract ASIN from Amazon URL
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

// Check if the URL is a valid Amazon URL
export const isValidAmazonUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('amazon.') && !!extractAsinFromUrl(url);
  } catch (error) {
    return false;
  }
};

// Get the correct Amazon domain for the URL
export const getAmazonDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'www.amazon.de'; // Default to German Amazon
  }
};

// Extract book information from the URL itself
export const extractInfoFromUrl = (url: string): { title: string; type: 'audiobook' | 'ebook' } => {
  // Default values
  let title = 'Unknown Title';
  let type: 'audiobook' | 'ebook' = 'ebook';
  
  try {
    // Extract type from URL
    if (url.includes('/audible/') || url.includes('/Audible-Hörbücher/') || url.includes('audiobook')) {
      type = 'audiobook';
    }
    
    // Clean up the URL and try to extract title
    const decodedUrl = decodeURIComponent(url);
    const urlParts = decodedUrl.split('/');
    
    // Look for keywords that indicate we're getting close to the title part
    const titleIndicators = ['dp', 'gp', 'product', 'ebook', 'Kindle', 'Audible'];
    
    for (let i = 0; i < urlParts.length; i++) {
      const part = urlParts[i];
      
      // If this part contains an indicator, the previous part might be the title
      if (titleIndicators.some(indicator => part.includes(indicator))) {
        if (i > 0 && urlParts[i-1] && !urlParts[i-1].includes('amazon')) {
          // Found potential title part
          title = urlParts[i-1]
            .replace(/-/g, ' ') // Replace hyphens with spaces
            .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize first letter of each word
          break;
        }
      }
    }
    
    // Additional cleanup for title
    title = title
      .replace(/^\s+|\s+$/g, '') // Trim spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single
      .replace(/\b(ebook|kindle|edition|audio|audiobook|book)\b/gi, ''); // Remove common words
    
    return { title, type };
  } catch (error) {
    console.error('Error extracting info from URL:', error);
    return { title, type };
  }
};

// Verify if an Amazon image URL is accessible
const verifyImageUrl = async (imageUrl: string): Promise<boolean> => {
  try {
    // Try to fetch image with HEAD request (doesn't download the image)
    const response = await axios.head(imageUrl, { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

// Generate multiple potential Amazon image URLs based on ASIN
const generateImageUrls = (asin: string): string[] => {
  return [
    `https://m.media-amazon.com/images/P/${asin}.jpg`,
    `https://m.media-amazon.com/images/I/${asin}.jpg`,
    `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg`,
    `https://images-na.ssl-images-amazon.com/images/I/${asin}.jpg`,
    `https://images-na.ssl-images-amazon.com/images/I/${asin}._SX450_.jpg`,
    `https://images-na.ssl-images-amazon.com/images/I/${asin}._SY450_.jpg`
  ];
};

// Main function to extract book data from Amazon URL
export const fetchBookDataFromAmazon = async (amazonUrl: string): Promise<AmazonBookData | null> => {
  try {
    if (!isValidAmazonUrl(amazonUrl)) {
      throw new Error('Invalid Amazon URL');
    }

    const asin = extractAsinFromUrl(amazonUrl);
    if (!asin) {
      throw new Error('Could not extract ASIN from URL');
    }

    console.log(`Extracting data for ASIN: ${asin}`);
    
    // Extract basic info from URL
    const { title, type } = extractInfoFromUrl(amazonUrl);
    
    // Generate and check image URLs
    const imageUrls = generateImageUrls(asin);
    let coverUrl = imageUrls[0]; // Default to first URL
    
    // Try to verify which image URL works
    for (const url of imageUrls) {
      const exists = await verifyImageUrl(url);
      if (exists) {
        coverUrl = url;
        break;
      }
    }
    
    // Determine language based on URL
    const language = amazonUrl.includes('.de/') ? 'German' : 'English';
    
    // Build basic book data from what we have
    return {
      title: title,
      author: 'Unknown Author', // Requires manual input
      description: 'Please enter a description.', // Requires manual input
      coverUrl: coverUrl,
      language: language,
      genre: 'Fiction', // Default, requires manual selection
      type: type,
      isbn: asin,
      asin: asin,
      pageCount: undefined,
      publishedDate: undefined,
      publisher: undefined
    };
  } catch (error) {
    console.error('Error extracting Amazon book data:', error);
    return null;
  }
};

// Helper function to convert Amazon book data to our Book model
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
