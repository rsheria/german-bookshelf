import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using Service Role key for RLS bypass
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Lookup country code for IP via free geo API
async function getCountryCode(ip) {
  try {
    // Use json.geoiplookup.io for reliable data
    const { data } = await axios.get(`https://json.geoiplookup.io/${ip}`);
    return data.country_code || '';
  } catch (err) {
    console.error(`Error fetching country code for ${ip}:`, err.message);
    return '';
  }
}

// Main backfill function
(async () => {
  const batchSize = 1000;
  let updatedCount = 0;

  while (true) {
    const { data, error } = await supabase
      .from('ip_logs')
      .select('id, ip_address')
      .is('country_code', null)
      .order('created_at', { ascending: false })
      .range(0, batchSize - 1);

    if (error) {
      console.error('Error fetching rows for backfill:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    console.log(`Processing ${data.length} rows to backfill`);

    for (const { id, ip_address } of data) {
      const code = await getCountryCode(ip_address);
      console.log(`Backfilling ${ip_address} -> ${code}`);
      const { error: updateErr } = await supabase
        .from('ip_logs')
        .update({ country_code: code })
        .eq('id', id);
      if (updateErr) console.error(`Update error for ${id}:`, updateErr.message);
      else updatedCount++;
    }
  }

  console.log(`Backfill complete: updated ${updatedCount} rows`);
})();
