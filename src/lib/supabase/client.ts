import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return a mock client during build time
    throw new Error('Supabase URL and Key are required');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
