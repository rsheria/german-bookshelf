import { serve } from './import_map.json?url=std@0.168.0/http/server.ts';
import { createClient } from './import_map.json?url=@supabase/supabase-js@2';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { csrf } from './import_map.json?url=csrf'; 

const CSRF_SECRET = Deno.env.get('CSRF_SECRET');

if (!CSRF_SECRET) {
  console.error('FATAL: CSRF_SECRET environment variable is not set!');
}

const csrfProtection = csrf({
  secret: CSRF_SECRET,
  cookie: false,
  saltLength: 10,
  secretLength: 20
});

interface ManageUserPayload {
  action: 'toggle_admin' | 'update_quota' | 'ban_user' | 'unban_user';
  targetUserId: string;
  isAdmin?: boolean; // For toggle_admin
  dailyQuota?: number; // For update_quota
  monthlyRequestQuota?: number; // For update_quota
  banReason?: string; // For ban_user
  banExpiresAt?: string | null; // For ban_user
}

serve(async (req: Request) => {
  const corsHeadersResponse = handleCors(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersResponse });
  }

  try {
    if (!CSRF_SECRET) {
      throw new Error('CSRF secret not configured on server.');
    }

    // Create Supabase client with auth context
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use Service Role for admin actions
    );
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 1. Check if requester is authenticated
    const { data: { user: requesterUser } } = await supabaseUserClient.auth.getUser();
    if (!requesterUser) {
      throw new Error('Unauthorized: User not authenticated.');
    }

    // 2. Check if requester is an admin
    const { data: isAdmin, error: adminCheckError } = await supabaseUserClient.rpc('is_authenticated_user_admin');
    if (adminCheckError) throw adminCheckError;
    if (!isAdmin) {
      throw new Error('Forbidden: User is not an admin.');
    }

    // 3. Verify CSRF token
    const csrfTokenFromHeader = req.headers.get('X-CSRF-Token');
    if (!csrfTokenFromHeader) {
      throw new Error('Forbidden: Missing CSRF token.');
    }
    const isValidCsrf = await csrfProtection.verify(CSRF_SECRET + requesterUser.id, csrfTokenFromHeader);
    if (!isValidCsrf) {
      throw new Error('Forbidden: Invalid CSRF token.');
    }

    // 4. Parse payload and perform action
    const payload: ManageUserPayload = await req.json();
    const { action, targetUserId } = payload;

    let resultData: any = null;
    let error: any = null;

    // --- Action Handlers ---
    switch (action) {
      case 'toggle_admin':
        if (requesterUser.id === targetUserId) {
            throw new Error('Admins cannot change their own status.');
        }
        ({ data: resultData, error } = await supabaseAdmin
          .from('profiles')
          .update({ is_admin: payload.isAdmin })
          .eq('id', targetUserId)
          .select('id, is_admin')
          .single());
        break;

      case 'update_quota':
        ({ data: resultData, error } = await supabaseAdmin
          .from('profiles')
          .update({ 
              daily_quota: payload.dailyQuota, 
              monthly_request_quota: payload.monthlyRequestQuota 
            })
          .eq('id', targetUserId)
          .select('id, daily_quota, monthly_request_quota')
          .single());
        break;

      case 'ban_user':
        if (requesterUser.id === targetUserId) {
            throw new Error('Admins cannot ban themselves.');
        }
        ({ data: resultData, error } = await supabaseAdmin.rpc('ban_user', {
          p_user_id: targetUserId,
          p_admin_id: requesterUser.id,
          p_reason: payload.banReason || 'No reason provided.',
          p_expires_at: payload.banExpiresAt
        })); 
        // Assuming ban_user RPC exists and handles inserting into ban table
        break;

      case 'unban_user':
         ({ data: resultData, error } = await supabaseAdmin.rpc('unban_user', {
           p_user_id: targetUserId,
           p_admin_id: requesterUser.id 
         }));
         // Assuming unban_user RPC exists and handles updating ban table
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    if (error) throw error;

    // 5. Return success response
    return new Response(JSON.stringify({ success: true, data: resultData }), {
      headers: { ...corsHeadersResponse, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in manage-user function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error processing user management request.' }), {
      headers: { ...corsHeadersResponse, 'Content-Type': 'application/json' },
      status: error.message?.includes('Forbidden') || error.message?.includes('Unauthorized') ? 403 : 500,
    });
  }
});
