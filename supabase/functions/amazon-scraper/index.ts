// Supabase Edge Function for Amazon Book Scraping
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

interface AmazonScraperRequest {
  url: string;
  options?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

// Call external scraping service function
async function scrapeAmazonPage(url: string): Promise<any> {
  try {
    // This would be the call to a real scraper service you've set up
    // For now, we'll use a mock implementation that mimics the expected output
    
    // Extract ASIN from the URL
    const asin = extractAsinFromUrl(url);
    if (!asin) {
      throw new Error('Invalid Amazon URL: Could not extract ASIN');
    }
    
    // Basic data extraction from URL patterns
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Attempt to extract title from URL
    let title = 'Unknown Title';
    const titlePart = path.split('/').filter(p => p && !p.includes('dp') && !p.includes('product'))[0] || '';
    if (titlePart) {
      title = titlePart.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    
    // Determine if it's an audiobook from URL
    const isAudiobook = url.toLowerCase().includes('audio') || url.toLowerCase().includes('hörbuch');
    
    // Generate Amazon image URL
    const coverUrl = `https://m.media-amazon.com/images/P/${asin}.jpg`;
    
    // Return mock data with the ASIN
    return {
      title,
      authors: ['Please specify author'],
      description: 'Please add a description for this book.',
      coverUrl,
      language: 'German',
      categories: [],
      type: isAudiobook ? 'audiobook' : 'ebook',
      isbn: '',
      isbn13: '',
      asin,
      pageCount: '',
      publicationDate: '',
      publisher: ''
    };
  } catch (error) {
    console.error('Error scraping Amazon page:', error);
    throw error;
  }
}

// Extract ASIN from Amazon URL
function extractAsinFromUrl(url: string): string | null {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Get the request body
    const { url, options = {} }: AmazonScraperRequest = await req.json()

    if (!url) {
      throw new Error('URL is required')
    }

    // Validate Amazon URL
    if (!url.includes('amazon.de')) {
      throw new Error('Only Amazon.de URLs are supported')
    }

    // Get the API key from request headers or environment
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header is required')
    }
    
    // Get supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Get user ID from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }
    
    // Check if user is admin
    const { data: admins, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
    
    if (adminError || !admins) {
      throw new Error('Unauthorized: Admin access required')
    }
    
    // Call the scraper function
    const bookData = await scrapeAmazonPage(url)

    // Return the book data
    return new Response(
      JSON.stringify({
        success: true,
        data: bookData
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
})
