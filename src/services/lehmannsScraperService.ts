/**
 * lehmannsScraperService.ts
 * 
 * This service handles the extraction of book data from Lehmanns.de product URLs.
 * Instead of scraping (which is blocked by CORS), it uses URL patterns to extract
 * basic information and provide meaningful defaults.
 */

import axios from 'axios';
import { Book } from '../types/supabase';

// Define the fields we need to extract from Lehmanns
export interface LehmannsBookData {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  language: string;
  genre: string;
  type: 'audiobook' | 'ebook';
  isbn: string;
  external_id: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
}

// Extract ISBN from Lehmanns URL
export const extractIsbnFromUrl = (url: string): string | null => {
  // Try different URL patterns
  const patterns = [
    /\/(\d{10,13})(?:\/|\?|$)/i, // Basic ISBN
    /\-(\d{10,13})(?:\/|\?|\-|$)/i, // ISBN after last hyphen
    /isbn=(\d{10,13})(?:&|$)/i,  // ISBN in query param
    /\/ebook\/(\d{10,13})(?:\/|\?|$)/i, // Ebook with ISBN
    /\/buch\/(\d{10,13})(?:\/|\?|$)/i   // Book with ISBN
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Check if the URL is a valid Lehmanns URL
export const isValidLehmannsUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('lehmanns.de');
  } catch (error) {
    return false;
  }
};

// Extract book information from the URL itself
export const extractInfoFromUrl = (url: string): { 
  title: string; 
  type: 'audiobook' | 'ebook';
  genre: string;
} => {
  // Default values
  let title = 'Unknown Title';
  let type: 'audiobook' | 'ebook' = 'ebook';
  let genre = 'Fiction';
  
  try {
    // Extract type from URL
    if (url.includes('/hoerbuch/') || url.includes('audio') || url.includes('hörbuch')) {
      type = 'audiobook';
    }
    
    // Extract genre from URL categories
    if (url.includes('/medizin')) {
      genre = 'Medicine';
    } else if (url.includes('/informatik') || url.includes('/computer')) {
      genre = 'Technology';
    } else if (url.includes('/psychologie')) {
      genre = 'Psychology';
    } else if (url.includes('/geschichte')) {
      genre = 'History';
    } else if (url.includes('/wirtschaft')) {
      genre = 'Business';
    } else if (url.includes('/belletristik') || url.includes('/romane')) {
      genre = 'Fiction';
    } else if (url.includes('/sachbuch')) {
      genre = 'Non-Fiction';
    }
    
    // Clean up the URL and try to extract title
    const urlParts = decodeURIComponent(url).split('/');
    
    // Find the last segment that likely contains the title
    for (let i = urlParts.length - 1; i >= 0; i--) {
      const part = urlParts[i];
      if (part.includes('-')) {
        // This is likely a title segment
        // Extract everything after the ISBN or product ID
        const titleParts = part.split('-');
        if (titleParts.length > 1) {
          // Skip the first part if it looks like an ISBN or product ID
          const isFirstPartId = /^\d+$/.test(titleParts[0]);
          const startIndex = isFirstPartId ? 1 : 0;
          
          // Join the remaining parts
          title = titleParts.slice(startIndex).join(' ')
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
    
    return { title, type, genre };
  } catch (error) {
    console.error('Error extracting info from URL:', error);
    return { title, type, genre };
  }
};

// Generate cover image URL based on ISBN
export const generateCoverUrl = (isbn: string): string => {
  // Attempt to generate a likely cover URL for Lehmanns
  return `https://www.lehmanns.de/media/wysiwyg/productimages/${isbn}.jpg`;
};

// Verify if an image URL is accessible
const verifyImageUrl = async (imageUrl: string): Promise<boolean> => {
  try {
    // Try to fetch image with HEAD request (doesn't download the image)
    const response = await axios.head(imageUrl, { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

// Main function to extract book data from Lehmanns URL
export const fetchBookDataFromLehmanns = async (lehmannsUrl: string): Promise<LehmannsBookData | null> => {
  try {
    if (!isValidLehmannsUrl(lehmannsUrl)) {
      throw new Error('Invalid Lehmanns URL');
    }

    console.log(`Extracting data from Lehmanns URL: ${lehmannsUrl}`);
    
    // Extract ISBN - this is the most reliable piece of information
    const isbn = extractIsbnFromUrl(lehmannsUrl);
    if (!isbn) {
      throw new Error('Could not extract ISBN from Lehmanns URL');
    }
    
    // Extract basic info from URL
    const { title, type, genre } = extractInfoFromUrl(lehmannsUrl);
    
    // Try to generate and verify cover URL
    let coverUrl = `https://www.lehmanns.de/media/wysiwyg/productimages/${isbn}.jpg`;
    
    // Fallback cover URLs to try
    const fallbackCoverUrls = [
      `https://www.lehmanns.de/media/catalog/product/${isbn}.jpg`,
      `https://www.lehmanns.de/media/catalog/product/${isbn}_1.jpg`,
      `https://www.lehmanns.de/shop/image/medium/bild_id/${isbn}`,
      `https://www.lehmanns.de/media/wysiwyg/covers/${isbn}.jpg`
    ];
    
    // Try fallbacks if the main URL doesn't work
    let coverUrlWorks = await verifyImageUrl(coverUrl);
    if (!coverUrlWorks) {
      for (const url of fallbackCoverUrls) {
        coverUrlWorks = await verifyImageUrl(url);
        if (coverUrlWorks) {
          coverUrl = url;
          break;
        }
      }
    }
    
    // If no cover URL works, use a placeholder
    if (!coverUrlWorks) {
      coverUrl = `https://via.placeholder.com/150x200/e0e0e0/333333?text=ISBN:${isbn}`;
    }
    
    // For Lehmanns, we know the publisher
    const publisher = "Lehmanns Media";
    
    // Build the book data
    return {
      title,
      author: 'Please enter author manually', // Requires manual input
      description: 'Please enter a description.', // Requires manual input
      coverUrl,
      language: 'German', // Default to German for Lehmanns
      genre,
      type,
      isbn,
      external_id: isbn, // Use ISBN as external ID
      publisher: publisher || undefined,
      publishedDate: undefined,
      pageCount: undefined
    };
  } catch (error) {
    console.error('Error extracting Lehmanns book data:', error);
    return null;
  }
};

// Helper function to convert Lehmanns book data to our Book model
export const lehmannsDataToBook = (lehmannsData: LehmannsBookData): Partial<Book> => {
  return {
    title: lehmannsData.title,
    author: lehmannsData.author,
    description: lehmannsData.description,
    cover_url: lehmannsData.coverUrl,
    language: lehmannsData.language,
    genre: lehmannsData.genre,
    type: lehmannsData.type,
    isbn: lehmannsData.isbn,
    external_id: lehmannsData.external_id,
    page_count: lehmannsData.pageCount,
    published_date: lehmannsData.publishedDate,
    publisher: lehmannsData.publisher,
  };
};
