import { createClient } from '@supabase/supabase-js';
import { getPublicEnv } from './env';

export const supabase = createClient(
  getPublicEnv('VITE_SUPABASE_URL'),
  getPublicEnv('VITE_SUPABASE_ANON_KEY'),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
