/**
 * Browser-compatible implementation for Amazon book scraping
 * Uses a proxy service to avoid CORS issues
 */

import axios from 'axios';
import { AmazonBookData } from './amazonScraper';

// API URL for a free proxy service
const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Extracts the title from Amazon page HTML
 */
function extractTitle(html: string): string {
  const titleMatch = html.match(/<span id="productTitle"[^>]*>([^<]+)<\/span>/);
  return titleMatch ? titleMatch[1].trim() : '';
}

/**
 * Extracts authors from Amazon page HTML
 */
function extractAuthors(html: string): string[] {
  const authors: string[] = [];
  
  // Match author links
  const authorRegex = /<a[^>]*href="[^"]*\/e\/[^"]*"[^>]*>([^<]+)<\/a>/g;
  let match;
  
  while ((match = authorRegex.exec(html)) !== null) {
    const author = match[1].trim();
    if (author && !authors.includes(author)) {
      authors.push(author);
    }
  }
  
  return authors;
}

/**
 * Extracts description from Amazon page HTML
 */
function extractDescription(html: string): string {
  // Try different description selectors
  const descriptionMatches = [
    html.match(/<div id="bookDescription_feature_div"[^>]*>(.*?)<\/div>/s),
    html.match(/<div id="productDescription"[^>]*>(.*?)<\/div>/s),
    html.match(/<div id="editorialReviews"[^>]*>(.*?)<\/div>/s)
  ];
  
  for (const match of descriptionMatches) {
    if (match && match[1]) {
      // Clean up HTML tags
      return match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  
  return '';
}

/**
 * Extracts cover image URL from Amazon page HTML
 */
function extractCoverUrl(html: string, asin: string): string {
  // Try to find image in the HTML
  const imgMatch = html.match(/<img[^>]*id="imgBlkFront"[^>]*src="([^"]+)"/);
  
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  
  // Fallback to generated image URL
  return `https://m.media-amazon.com/images/P/${asin}.jpg`;
}

/**
 * Extracts ISBN from Amazon page HTML
 */
function extractIsbn(html: string): { isbn: string, isbn13: string } {
  // Match ISBN-10
  const isbn10Match = html.match(/ISBN-10<\/span>[\s:]*<span[^>]*>([0-9X]{10})<\/span>/);
  
  // Match ISBN-13
  const isbn13Match = html.match(/ISBN-13<\/span>[\s:]*<span[^>]*>([0-9]{13})<\/span>/);
  
  return {
    isbn: isbn10Match && isbn10Match[1] ? isbn10Match[1] : '',
    isbn13: isbn13Match && isbn13Match[1] ? isbn13Match[1] : ''
  };
}

/**
 * Extracts page count from Amazon page HTML
 */
function extractPageCount(html: string): string {
  // Match page count
  const pageMatch = html.match(/Seitenzahl[^:]*:([^<]+)</);
  if (pageMatch) {
    const pageText = pageMatch[1].trim();
    const numberMatch = pageText.match(/\d+/);
    if (numberMatch) {
      return numberMatch[0];
    }
  }
  
  return '';
}

/**
 * Extracts book details from HTML
 */
function extractBookDetails(html: string, asin: string): Partial<AmazonBookData> {
  // Basic extraction
  const title = extractTitle(html);
  const authors = extractAuthors(html);
  const description = extractDescription(html);
  const coverUrl = extractCoverUrl(html, asin);
  const { isbn, isbn13 } = extractIsbn(html);
  const pageCount = extractPageCount(html);
  
  // Determine if it's an audiobook
  const isAudiobook = html.toLowerCase().includes('hörbuch') || 
                      html.toLowerCase().includes('audiobook');
  
  return {
    title,
    authors,
    description,
    coverUrl,
    language: 'German',
    categories: [],
    type: isAudiobook ? 'audiobook' : 'ebook',
    isbn,
    isbn13,
    asin,
    pageCount,
    publicationDate: '',
    publisher: ''
  };
}

/**
 * Browser-friendly function to scrape Amazon book data
 */
export async function scrapeAmazonPage(url: string): Promise<AmazonBookData> {
  try {
    // Extract ASIN from URL
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (!asinMatch) {
      throw new Error('Could not extract ASIN from URL');
    }
    
    const asin = asinMatch[1];
    
    // Use CORS proxy to fetch page HTML
    const response = await axios.get(`${CORS_PROXY}${encodeURIComponent(url)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Extract book details from HTML
    const bookData = extractBookDetails(response.data, asin);
    
    // Return with default values for missing fields
    return {
      title: bookData.title || 'Unknown Title',
      authors: bookData.authors && bookData.authors.length > 0 ? bookData.authors : ['Unknown Author'],
      description: bookData.description || 'No description available',
      coverUrl: bookData.coverUrl || `https://m.media-amazon.com/images/P/${asin}.jpg`,
      language: bookData.language || 'German',
      categories: bookData.categories || [],
      type: bookData.type || 'ebook',
      isbn: bookData.isbn || '',
      isbn13: bookData.isbn13 || '',
      asin: asin,
      pageCount: bookData.pageCount || '',
      publicationDate: bookData.publicationDate || '',
      publisher: bookData.publisher || ''
    };
  } catch (error) {
    console.error('Error scraping Amazon page:', error);
    throw error;
  }
}
