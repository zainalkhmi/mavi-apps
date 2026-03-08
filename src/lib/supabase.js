import { createClient } from '@supabase/supabase-js';
import { isValidSupabaseUrl, normalizeSupabaseUrl } from './runtimeConfig';

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey);

if (!isSupabaseConfigured) {
    // eslint-disable-next-line no-console
    console.warn('[mavi-mobile] Missing/invalid Supabase env. Set VITE_SUPABASE_URL (https://<project-ref>.supabase.co) and VITE_SUPABASE_ANON_KEY');
}

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : null;

export const assertSupabaseConfigured = () => {
    if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Set valid VITE_SUPABASE_URL (https://<project-ref>.supabase.co) and VITE_SUPABASE_ANON_KEY in .env / deployment env vars.');
    }
};
