/**
 * amazonScraperService.ts
 * 
 * This service handles the extraction of book data from Amazon product pages.
 * It uses a proxy server for web scraping to avoid CORS issues.
 */

import axios from 'axios';
import { Book } from '../types/supabase';

// We'll use a proxy server to avoid CORS issues when scraping
// In a production environment, use a proper backend service or API
const CORS_PROXY = 'https://corsproxy.io/?';

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

// Main function to fetch and extract book data from Amazon
export const fetchBookDataFromAmazon = async (amazonUrl: string): Promise<AmazonBookData | null> => {
  try {
    if (!isValidAmazonUrl(amazonUrl)) {
      throw new Error('Invalid Amazon URL');
    }

    const asin = extractAsinFromUrl(amazonUrl);
    if (!asin) {
      throw new Error('Could not extract ASIN from URL');
    }

    // Determine book type from URL
    const type = amazonUrl.includes('/kindle/') || amazonUrl.includes('/Kindle-eBooks/') 
      ? 'ebook' 
      : (amazonUrl.includes('/audible/') || amazonUrl.includes('/Audible-Hörbücher/') 
        ? 'audiobook' 
        : 'ebook'); // Default to ebook

    // Fetch the Amazon product page
    const response = await axios.get(`${CORS_PROXY}${amazonUrl}`, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;

    // Use regular expressions to extract information
    // This is a simplified approach, in production you should use a proper HTML parser
    const title = extractMetaData(html, 'og:title') || extractHtmlData(html, '#productTitle');
    const author = extractAuthor(html);
    const description = extractMetaData(html, 'og:description') || extractHtmlData(html, '#bookDescription_feature_div');
    const coverUrl = extractMetaData(html, 'og:image') || extractHtmlData(html, '#imgBlkFront', 'src');
    const language = extractLanguage(html) || 'German';
    const genre = extractGenre(html) || 'Fiction';

    // Extract additional metadata
    const isbn = extractIsbn(html, asin);
    const pageCount = extractPageCount(html);
    const publishedDate = extractPublishedDate(html);
    const publisher = extractPublisher(html);

    return {
      title: cleanupText(title) || 'Unknown Title',
      author: cleanupText(author) || 'Unknown Author',
      description: cleanupText(description) || 'No description available.',
      coverUrl: coverUrl || '',
      language,
      genre,
      type,
      isbn,
      asin,
      pageCount: pageCount || undefined,
      publishedDate: publishedDate || undefined,
      publisher: cleanupText(publisher) || undefined
    };
  } catch (error) {
    console.error('Error fetching book data from Amazon:', error);
    return null;
  }
};

// Helper function to extract metadata from meta tags
const extractMetaData = (html: string, property: string): string | null => {
  const regex = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["'](.*?)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
};

// Helper function to extract data from HTML elements
const extractHtmlData = (html: string, selector: string, attribute: string = ''): string | null => {
  const elementRegex = new RegExp(`<[^>]*?${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*?>${attribute ? '' : '(.*?)</'}`, 'i');
  const match = html.match(elementRegex);
  
  if (!match) return null;
  
  if (attribute) {
    const attrRegex = new RegExp(`${attribute}=["'](.*?)["']`, 'i');
    const attrMatch = match[0].match(attrRegex);
    return attrMatch ? attrMatch[1].trim() : null;
  }
  
  return match[1] ? match[1].trim() : null;
};

// Helper function to extract author information
const extractAuthor = (html: string): string | null => {
  // Try different patterns for author extraction
  const patterns = [
    /<span class="author[^>]*?>(.*?)<\/span>/i,
    /<a id="bylineInfo"[^>]*?>(.*?)<\/a>/i,
    /<a class="a-link-normal contributorNameID"[^>]*?>(.*?)<\/a>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Clean up HTML tags
      return match[1].replace(/<[^>]*>/g, '').trim();
    }
  }

  return null;
};

// Helper function to extract language information
const extractLanguage = (html: string): string | null => {
  // Look for language information in the page
  if (html.includes('Sprache: Deutsch') || html.includes('Language: German')) {
    return 'German';
  }
  if (html.includes('Sprache: Englisch') || html.includes('Language: English')) {
    return 'English';
  }
  if (html.includes('Sprache: Deutsch, Englisch') || html.includes('Language: German, English')) {
    return 'German-English';
  }
  
  return 'German'; // Default to German
};

// Helper function to extract genre information
const extractGenre = (html: string): string | null => {
  // Common genres
  const genres = [
    'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy',
    'Mystery', 'Thriller', 'Romance', 'Biography',
    'History', 'Self-Help'
  ];
  
  // Look for genre in breadcrumbs or categories
  const breadcrumbsMatch = html.match(/<div id="wayfinding-breadcrumbs_container"[^>]*?>(.*?)<\/div>/i);
  if (breadcrumbsMatch) {
    const breadcrumbs = breadcrumbsMatch[1];
    
    for (const genre of genres) {
      if (breadcrumbs.includes(genre)) {
        return genre;
      }
    }
  }
  
  // Try to guess based on keywords in the page
  for (const genre of genres) {
    if (html.includes(`category=${genre}`) || html.includes(`genre=${genre}`)) {
      return genre;
    }
  }
  
  return 'Fiction'; // Default genre
};

// Helper function to extract ISBN
const extractIsbn = (html: string, asin: string): string => {
  // Look for ISBN pattern
  const isbnMatch = html.match(/ISBN(?:-10|-13)?: ([\d-]+)/i);
  if (isbnMatch && isbnMatch[1]) {
    return isbnMatch[1].replace(/-/g, '');
  }
  
  // If not found, return ASIN as fallback
  return asin;
};

// Helper function to extract page count
const extractPageCount = (html: string): number | undefined => {
  // Look for page count information
  const pageMatch = html.match(/(\d+) Seiten|(\d+) pages/i);
  if (pageMatch) {
    return parseInt(pageMatch[1] || pageMatch[2], 10);
  }
  
  return undefined;
};

// Helper function to extract published date
const extractPublishedDate = (html: string): string | undefined => {
  // Look for published date
  const dateMatch = html.match(/Erscheinungsdatum: ([\d\. ]+)|Publication date: ([\w\d, ]+)/i);
  if (dateMatch) {
    return (dateMatch[1] || dateMatch[2]).trim();
  }
  
  return undefined;
};

// Helper function to extract publisher
const extractPublisher = (html: string): string | null => {
  // Look for publisher information
  const publisherMatch = html.match(/Verlag: ([^;]+)|Publisher: ([^;]+)/i);
  if (publisherMatch) {
    return (publisherMatch[1] || publisherMatch[2]).trim();
  }
  
  return null;
};

// Helper function to clean up text
const cleanupText = (text: string | null | undefined): string => {
  if (!text) return '';
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
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
