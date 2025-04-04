/**
 * amazonScraperService.ts
 * 
 * This service handles the extraction of book data from Amazon product pages.
 * It uses multiple proxy servers for web scraping to avoid CORS issues.
 */

import axios from 'axios';
import { Book } from '../types/supabase';

// We'll use multiple CORS proxies to improve success rate if one fails
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.org/?',
  'https://api.codetabs.com/v1/proxy/?quest=',
  'https://thingproxy.freeboard.io/fetch/',
  'https://cors-anywhere-production-39d0.up.railway.app/'
];

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

// Helper function to try fetching with different proxies
const fetchWithProxies = async (url: string, proxyIndex = 0): Promise<string> => {
  if (proxyIndex >= CORS_PROXIES.length) {
    throw new Error('All proxies failed to fetch the content');
  }

  try {
    // Use a simple approach for Amazon - using fetch API directly
    const response = await axios.get(`${CORS_PROXIES[proxyIndex]}${encodeURIComponent(url)}`, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 seconds timeout
    });
    
    return response.data;
  } catch (error) {
    console.warn(`Proxy ${CORS_PROXIES[proxyIndex]} failed. Trying next proxy...`);
    return fetchWithProxies(url, proxyIndex + 1);
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

    // Try to fetch with multiple proxies
    console.log(`Attempting to fetch data from Amazon for ASIN: ${asin}`);
    
    try {
      // Try to fetch with proxies
      const html = await fetchWithProxies(amazonUrl);
      
      // If we get here, we have HTML content to parse
      return extractDataFromHtml(html, asin, type);
    } catch (proxyError) {
      console.error('All proxies failed to fetch data:', proxyError);
      
      // Manual fallback with ASIN: Try to construct basic info from the URL and metadata
      const urlParts = amazonUrl.split('/');
      let title = 'Unknown Title';
      
      // Try to extract title from URL
      for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'dp' || urlParts[i] === 'gp' || urlParts[i].includes(asin)) {
          if (i > 0 && urlParts[i-1] && !urlParts[i-1].includes('amazon')) {
            title = urlParts[i-1].replace(/-/g, ' ').trim();
            // Capitalize first letter of each word
            title = title.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
          break;
        }
      }
      
      // Return minimal data extracted from URL
      return {
        title,
        author: 'Unknown Author',
        description: 'No description available. Please enter manually.',
        coverUrl: `https://m.media-amazon.com/images/P/${asin}.jpg`, // Try Amazon's image URL pattern
        language: amazonUrl.includes('.de/') ? 'German' : 'English',
        genre: 'Fiction',
        type,
        isbn: asin,
        asin,
        publishedDate: undefined,
        publisher: undefined,
        pageCount: undefined
      };
    }
  } catch (error) {
    console.error('Error fetching book data from Amazon:', error);
    return null;
  }
};

// Function to extract data from HTML content
const extractDataFromHtml = (html: string, asin: string, type: 'audiobook' | 'ebook'): AmazonBookData => {
  // Use regular expressions to extract information
  // This is a simplified approach, in production you should use a proper HTML parser
  
  // Enhanced title extraction with multiple patterns
  let title = extractMetaData(html, 'og:title') || 
             extractHtmlData(html, '#productTitle') || 
             extractHtmlData(html, '#ebooksProductTitle') || 
             extractHtmlData(html, '#audibleProductTitle');
  
  // Clean up title - remove "Amazon.com: ", " - Kindle edition by...", etc.
  if (title) {
    const cleanupPatterns = [
      /Amazon\.com: /i,
      /Amazon\.de: /i,
      / - Kindle edition by.*/i,
      / \(.*?\)$/i,
      / \[.*?\]$/i,
      / Kindle$/i,
      / Audible$/i,
      / eBook$/i
    ];
    
    for (const pattern of cleanupPatterns) {
      title = title.replace(pattern, '');
    }
    title = title.trim();
  }
  
  // Enhanced author extraction with more patterns
  const author = extractAuthor(html);
  
  // Enhanced description extraction with multiple patterns
  const description = extractMetaData(html, 'og:description') || 
                     extractBookDescription(html) ||
                     extractHtmlData(html, '#bookDescription_feature_div') ||
                     extractHtmlData(html, '#productDescription') ||
                     extractHtmlData(html, '#editorialReviews');
  
  const coverUrl = extractMetaData(html, 'og:image') || 
                  extractHtmlData(html, '#imgBlkFront', 'src') ||
                  extractHtmlData(html, '#ebooksImgBlkFront', 'src') ||
                  extractHtmlData(html, '#audibleImgBlkFront', 'src');
  
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
    coverUrl: coverUrl || `https://m.media-amazon.com/images/P/${asin}.jpg`, // Use ASIN-based image as fallback
    language,
    genre,
    type,
    isbn,
    asin,
    pageCount: pageCount || undefined,
    publishedDate: publishedDate || undefined,
    publisher: cleanupText(publisher) || undefined
  };
};

// Specialized function to extract book description (with enhanced patterns)
const extractBookDescription = (html: string): string | null => {
  // First try with standard book description divs
  const descriptionPatterns = [
    /<div id="bookDescription_feature_div"[^>]*?>(.*?)<\/div>/is,
    /<div id="productDescription"[^>]*?>(.*?)<\/div>/is,
    /<div id="editorialReviews"[^>]*?>(.*?)<\/div>/is,
    /<noscript>[^<]*?<div>(.*?)<\/div>/is,
    /<div class="a-expander-content[^"]*?"[^>]*?>(.*?)<\/div>/is
  ];
  
  for (const pattern of descriptionPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/<[^>]*>/g, ' ').trim();
    }
  }
  
  return null;
};

// Helper function to extract author information
const extractAuthor = (html: string): string | null => {
  // Try with meta tags first (most reliable)
  const authorMeta = html.match(/<meta\s+name=["']author["']\s+content=["'](.*?)["']/i);
  if (authorMeta && authorMeta[1]) {
    return authorMeta[1].trim();
  }
  
  // Look for common author patterns
  const authorPatterns = [
    // Byline pattern
    /<a id="bylineInfo"[^>]*?>(.*?)<\/a>/i,
    // Contributor link 
    /<a class="a-link-normal contributorNameID"[^>]*?>(.*?)<\/a>/i,
    // Author span
    /<span class="author[^"]*?"[^>]*?>(.*?)<\/span>/i,
    // Author with link
    /by\s+<a[^>]*?>(.*?)<\/a>/i,
    // Author with span
    /by\s+<span[^>]*?>(.*?)<\/span>/i,
    // Kindle header author
    /<span[^>]*?class="[^"]*?kindle-header[^"]*?"[^>]*?>.*?by\s+(.*?)<\/span>/i,
    // Simple text pattern
    /Author:\s*([^<\n]+)/i
  ];

  for (const pattern of authorPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      // Clean up HTML tags
      return match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  
  // Try to find it in broader content
  const authorContainers = [
    /<div id="bylineInfo"[^>]*?>(.*?)<\/div>/is,
    /<div id="authorByline"[^>]*?>(.*?)<\/div>/is,
    /<div id="contributorByline"[^>]*?>(.*?)<\/div>/is
  ];
  
  for (const container of authorContainers) {
    const containerMatch = html.match(container);
    if (containerMatch && containerMatch[1]) {
      const content = containerMatch[1];
      // Detect strings like "by Author Name" or "Author: Author Name"
      const authorMatch = content.match(/by\s+([^<\n]+?)(?:<|\n|$)/i) || 
                         content.match(/Author[s]?[:\.]\s+([^<\n]+?)(?:<|\n|$)/i);
      
      if (authorMatch && authorMatch[1]) {
        return authorMatch[1].trim();
      }
    }
  }

  return null;
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
const extractPageCount = (html: string): number | null => {
  // Look for page count information
  const pageMatch = html.match(/(\d+) Seiten|(\d+) pages/i);
  if (pageMatch) {
    return parseInt(pageMatch[1] || pageMatch[2], 10);
  }
  
  return null;
};

// Helper function to extract published date
const extractPublishedDate = (html: string): string | null => {
  // Look for published date
  const dateMatch = html.match(/Erscheinungsdatum: ([\d\. ]+)|Publication date: ([\w\d, ]+)/i);
  if (dateMatch) {
    return (dateMatch[1] || dateMatch[2]).trim();
  }
  
  return null;
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
