import { createClient } from '@supabase/supabase-js';

let cachedClient = null;
let cachedClientKey = '';

const getProjectRef = (supabaseUrl = '') => {
    try {
        const host = new URL(supabaseUrl).hostname;
        return host.split('.')[0] || 'capture';
    } catch {
        return 'capture';
    }
};

const getClientKey = (supabaseUrl = '', supabaseAnonKey = '') => `${supabaseUrl}::${supabaseAnonKey}`;

export const getCaptureSupabaseClient = ({ supabaseUrl = '', supabaseAnonKey = '' } = {}) => {
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const nextKey = getClientKey(supabaseUrl, supabaseAnonKey);
    if (cachedClient && cachedClientKey === nextKey) {
        return cachedClient;
    }

    const projectRef = getProjectRef(supabaseUrl);

    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: `mavi-capture-${projectRef}`
        }
    });
    cachedClientKey = nextKey;

    return cachedClient;
};

export const isSupabaseTableMissingError = (error) => {
    const status = Number(error?.status || error?.statusCode);
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();

    if (status === 404) return true;
    if (code === 'PGRST205') return true;
    if (message.includes('could not find') && message.includes('table')) return true;
    if (message.includes('relation') && message.includes('does not exist')) return true;

    return false;
};
