// Allowlist of origins that can access the functions
// Should ideally be your Netlify deployment URL and localhost for development
const allowedOrigins = [
  Deno.env.get('SITE_URL'), // Your production site URL from env
  'http://localhost:3000', // Common React dev port
  'http://localhost:5173', // Common Vite dev port
  'http://localhost:8888', // Netlify dev port
  'http://localhost:4321' // Astro dev port
].filter(Boolean); // Filter out null/undefined env vars

export const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Origin': '*' // Dynamically set later based on request origin
};

export function handleCors(req: Request): HeadersInit {
  const origin = req.headers.get('origin');
  const headers = { ...corsHeaders };

  // Only allow requests from whitelisted origins
  if (origin && allowedOrigins.includes(origin)) {
     headers['Access-Control-Allow-Origin'] = origin;
  }
  
  // Safari needs a cache control header for CORS
  // See https://github.com/expressjs/cors/issues/149
  headers['Vary'] = 'Origin'; // Tell caches that the response depends on the Origin header

  return headers;
}
