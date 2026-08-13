import { createClient } from '@supabase/supabase-js';

// Client-safe only: URL + anon key (respects Row Level Security).
// Never import the service_role key here — it must stay server-only (see .env).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
