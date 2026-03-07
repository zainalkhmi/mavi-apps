import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
    // eslint-disable-next-line no-console
    console.warn('[mavi-mobile-reader] Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
    })
    : null;

export const assertSupabaseConfigured = () => {
    if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in mavi-mobile-reader/.env');
    }
};
