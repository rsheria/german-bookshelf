/**
 * lehmannsScraperService.ts
 * 
 * This service handles the extraction of book data from Lehmanns.de product URLs.
 * It uses CORS proxies to access the HTML content and extract book metadata.
 */

import axios from 'axios';
import { Book } from '../types/supabase';

// We'll use multiple CORS proxies to improve success rate if one fails
const CORS_PROXIES = [
  'https://corsproxy.org/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy/?quest=',
  'https://cors-anywhere-production-39d0.up.railway.app/',
  'https://thingproxy.freeboard.io/fetch/',
];

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

// Helper function to try fetching with different proxies
const fetchWithProxies = async (url: string, proxyIndex = 0): Promise<string> => {
  if (proxyIndex >= CORS_PROXIES.length) {
    throw new Error('All proxies failed to fetch the content');
  }

  try {
    console.log(`Trying proxy ${CORS_PROXIES[proxyIndex]} for Lehmanns data...`);
    
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

// Main function to fetch book data from Lehmanns.de
export const fetchBookDataFromLehmanns = async (lehmannsUrl: string): Promise<LehmannsBookData | null> => {
  try {
    if (!isValidLehmannsUrl(lehmannsUrl)) {
      throw new Error('Invalid Lehmanns URL');
    }

    // Try to fetch with proxies
    console.log(`Attempting to fetch data from Lehmanns URL: ${lehmannsUrl}`);
    const html = await fetchWithProxies(lehmannsUrl);
    
    // Extract basic info
    const title = extractTitle(html);
    const author = extractAuthor(html);
    const description = extractDescription(html);
    const coverUrl = extractCoverImage(html);
    const isbn = extractIsbn(html) || extractIsbnFromUrl(lehmannsUrl) || '';
    const language = extractLanguage(html);
    const publisher = extractPublisher(html);
    const publishedDate = extractPublishedDate(html);
    const pageCount = extractPageCount(html);
    
    // Determine book type based on URL and content
    const type = determineBookType(lehmannsUrl, html);
    
    // Extract genre from categories
    const genre = extractGenre(html);
    
    return {
      title: title || 'Unknown Title',
      author: author || 'Unknown Author',
      description: description || 'No description available.',
      coverUrl: coverUrl || '',
      language: language || 'German', // Default to German for Lehmanns
      genre: genre || 'Fiction',
      type,
      isbn,
      external_id: isbn, // Use ISBN as external ID for Lehmanns
      pageCount: pageCount || undefined,
      publishedDate: publishedDate || undefined,
      publisher: publisher || undefined
    };
  } catch (error) {
    console.error('Error fetching book data from Lehmanns:', error);
    return null;
  }
};

// Extract title from Lehmanns HTML
const extractTitle = (html: string): string | null => {
  // Try with h1 product title first
  const titleMatch = html.match(/<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>(.*?)<\/h1>/i) ||
                    html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h1>/i) ||
                    html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  
  if (titleMatch && titleMatch[1]) {
    return clean(titleMatch[1]);
  }
  
  // Try with meta tags
  const metaTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                         html.match(/<meta\s+name="title"\s+content="([^"]+)"/i);
  
  if (metaTitleMatch && metaTitleMatch[1]) {
    return clean(metaTitleMatch[1]);
  }
  
  return null;
};

// Extract author from Lehmanns HTML
const extractAuthor = (html: string): string | null => {
  // Look for author in specific elements
  const authorMatch = html.match(/<div[^>]*class="[^"]*product-author[^"]*"[^>]*>(.*?)<\/div>/i) ||
                     html.match(/<a[^>]*class="[^"]*author[^"]*"[^>]*>(.*?)<\/a>/i) ||
                     html.match(/Autor:?\s*<[^>]*>(.*?)<\/a>/i) ||
                     html.match(/Verfasser:?\s*<[^>]*>(.*?)<\/a>/i);
  
  if (authorMatch && authorMatch[1]) {
    return clean(authorMatch[1]);
  }
  
  // Try with meta tags
  const metaAuthorMatch = html.match(/<meta\s+name="author"\s+content="([^"]+)"/i);
  
  if (metaAuthorMatch && metaAuthorMatch[1]) {
    return clean(metaAuthorMatch[1]);
  }
  
  return null;
};

// Extract description from Lehmanns HTML
const extractDescription = (html: string): string | null => {
  // Look for product description
  const descriptionMatch = html.match(/<div[^>]*class="[^"]*product-description[^"]*"[^>]*>(.*?)<\/div>/is) ||
                         html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is) ||
                         html.match(/<div[^>]*id="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is);
  
  if (descriptionMatch && descriptionMatch[1]) {
    return clean(descriptionMatch[1]);
  }
  
  // Try with meta tags
  const metaDescriptionMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                             html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  
  if (metaDescriptionMatch && metaDescriptionMatch[1]) {
    return clean(metaDescriptionMatch[1]);
  }
  
  return null;
};

// Extract cover image from Lehmanns HTML
const extractCoverImage = (html: string): string | null => {
  // Look for product image
  const imageMatch = html.match(/<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]+)"/i) ||
                    html.match(/<img[^>]*id="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i) ||
                    html.match(/<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i);
  
  if (imageMatch && imageMatch[1]) {
    // Make sure we have absolute URL
    let imageUrl = imageMatch[1];
    if (imageUrl.startsWith('/')) {
      imageUrl = `https://www.lehmanns.de${imageUrl}`;
    }
    return imageUrl;
  }
  
  // Try with meta tags
  const metaImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  
  if (metaImageMatch && metaImageMatch[1]) {
    return metaImageMatch[1];
  }
  
  return null;
};

// Extract ISBN from Lehmanns HTML
const extractIsbn = (html: string): string | null => {
  // Look for ISBN in product details
  const isbnMatch = html.match(/ISBN(?:-10|-13)?:?\s*(\d[\d-]+\d)/i) ||
                   html.match(/ISBN:?\s*<[^>]*>(\d[\d-]+\d)<\/[^>]*>/i) ||
                   html.match(/<[^>]*>ISBN:?\s*<\/[^>]*>\s*<[^>]*>(\d[\d-]+\d)<\/[^>]*>/i);
  
  if (isbnMatch && isbnMatch[1]) {
    // Clean up ISBN by removing hyphens
    return isbnMatch[1].replace(/-/g, '');
  }
  
  return null;
};

// Extract language from Lehmanns HTML
const extractLanguage = (html: string): string | null => {
  // Look for language in product details
  const languageMatch = html.match(/Sprache:?\s*<[^>]*>(.*?)<\/[^>]*>/i) ||
                       html.match(/<[^>]*>Sprache:?\s*<\/[^>]*>\s*<[^>]*>(.*?)<\/[^>]*>/i);
  
  if (languageMatch && languageMatch[1]) {
    const lang = clean(languageMatch[1]).toLowerCase();
    
    if (lang.includes('deutsch') || lang === 'german') {
      return 'German';
    } else if (lang.includes('englisch') || lang === 'english') {
      return 'English';
    } else if (lang.includes('deutsch') && lang.includes('englisch')) {
      return 'German-English';
    }
  }
  
  // Default to German for Lehmanns
  return 'German';
};

// Extract publisher from Lehmanns HTML
const extractPublisher = (html: string): string | null => {
  // Look for publisher in product details
  const publisherMatch = html.match(/Verlag:?\s*<[^>]*>(.*?)<\/[^>]*>/i) ||
                        html.match(/<[^>]*>Verlag:?\s*<\/[^>]*>\s*<[^>]*>(.*?)<\/[^>]*>/i) ||
                        html.match(/publisher:?\s*<[^>]*>(.*?)<\/[^>]*>/i);
  
  if (publisherMatch && publisherMatch[1]) {
    return clean(publisherMatch[1]);
  }
  
  return null;
};

// Extract published date from Lehmanns HTML
const extractPublishedDate = (html: string): string | null => {
  // Look for published date in product details
  const dateMatch = html.match(/Erscheinungsdatum:?\s*<[^>]*>(.*?)<\/[^>]*>/i) ||
                   html.match(/<[^>]*>Erscheinungsdatum:?\s*<\/[^>]*>\s*<[^>]*>(.*?)<\/[^>]*>/i) ||
                   html.match(/Erscheinungstermin:?\s*<[^>]*>(.*?)<\/[^>]*>/i);
  
  if (dateMatch && dateMatch[1]) {
    return clean(dateMatch[1]);
  }
  
  return null;
};

// Extract page count from Lehmanns HTML
const extractPageCount = (html: string): number | undefined => {
  // Look for page count in product details
  const pageMatch = html.match(/Seitenzahl:?\s*<[^>]*>(\d+)<\/[^>]*>/i) ||
                   html.match(/<[^>]*>Seitenzahl:?\s*<\/[^>]*>\s*<[^>]*>(\d+)<\/[^>]*>/i) ||
                   html.match(/Umfang:?\s*<[^>]*>(\d+)\s*Seiten<\/[^>]*>/i);
  
  if (pageMatch && pageMatch[1]) {
    return parseInt(pageMatch[1], 10);
  }
  
  return undefined;
};

// Extract genre from Lehmanns HTML
const extractGenre = (html: string): string | null => {
  // Common genres to look for
  const genres = [
    'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy',
    'Mystery', 'Thriller', 'Romance', 'Biography',
    'History', 'Self-Help', 'Medicine', 'Science', 'Technology'
  ];
  
  // Look for category/breadcrumb data
  const categoryMatch = html.match(/<ul[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>(.*?)<\/ul>/is) ||
                       html.match(/<div[^>]*class="[^"]*categories[^"]*"[^>]*>(.*?)<\/div>/is);
  
  if (categoryMatch && categoryMatch[1]) {
    const categoryText = categoryMatch[1].toLowerCase();
    
    // Try to find matching genre
    for (const genre of genres) {
      if (categoryText.includes(genre.toLowerCase())) {
        return genre;
      }
    }
    
    // Try German equivalents
    if (categoryText.includes('belletristik')) return 'Fiction';
    if (categoryText.includes('sachbuch')) return 'Non-Fiction';
    if (categoryText.includes('science-fiction') || categoryText.includes('sci-fi')) return 'Science Fiction';
    if (categoryText.includes('fantasy')) return 'Fantasy';
    if (categoryText.includes('krimi')) return 'Mystery';
    if (categoryText.includes('thriller')) return 'Thriller';
    if (categoryText.includes('roman')) return 'Fiction';
    if (categoryText.includes('biografie')) return 'Biography';
    if (categoryText.includes('geschichte')) return 'History';
    if (categoryText.includes('ratgeber')) return 'Self-Help';
    if (categoryText.includes('medizin')) return 'Medicine';
    if (categoryText.includes('wissenschaft')) return 'Science';
    if (categoryText.includes('technik')) return 'Technology';
  }
  
  return 'Fiction'; // Default to Fiction
};

// Determine book type from URL and HTML
const determineBookType = (url: string, html: string): 'audiobook' | 'ebook' => {
  // Check URL first
  if (url.toLowerCase().includes('ebook') || url.toLowerCase().includes('e-book')) {
    return 'ebook';
  }
  
  if (url.toLowerCase().includes('audio') || url.toLowerCase().includes('hörbuch')) {
    return 'audiobook';
  }
  
  // Check HTML content
  if (html.toLowerCase().includes('ebook') || html.toLowerCase().includes('e-book')) {
    return 'ebook';
  }
  
  if (html.toLowerCase().includes('audio') || html.toLowerCase().includes('hörbuch')) {
    return 'audiobook';
  }
  
  // Default to ebook
  return 'ebook';
};

// Helper function to clean up HTML and text
const clean = (text: string): string => {
  if (!text) return '';
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
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
