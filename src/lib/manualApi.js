import { assertSupabaseConfigured, supabase } from './supabase';

const normalizeWorkflowStatus = (status) => {
    const value = String(status || '').trim().toUpperCase();
    if (!value) return 'DRAFT';
    if (['DRAFT', 'REVIEW', 'PUBLISHED'].includes(value)) return value;
    if (['IN REVIEW', 'IN_REVIEW', 'PROPOSED'].includes(value)) return 'REVIEW';
    if (['APPROVED', 'RELEASED'].includes(value)) return 'PUBLISHED';
    return 'DRAFT';
};

const normalizeRow = (row) => {
    const rawContent = row?.content_json || row?.steps || {};
    const content = typeof rawContent === 'string'
        ? safeParseJson(rawContent)
        : rawContent;

    return {
        id: row?.id,
        title: row?.title || '',
        documentNumber: row?.document_number || '',
        version: row?.version || '1.0',
        status: normalizeWorkflowStatus(row?.status),
        summary: row?.summary || '',
        updatedAt: row?.updated_at || null,
        content
    };
};

const safeParseJson = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
};

export const extractSteps = (manual) => {
    if (!manual) return [];
    const contentObj = manual?.content && typeof manual.content === 'object' && !Array.isArray(manual.content)
        ? manual.content
        : null;
    return manual?.steps || contentObj?.steps || manual?.content || [];
};

export const listPublishedManualSummaries = async (search = '') => {
    assertSupabaseConfigured();
    const searchText = String(search || '').trim();

    let query = supabase
        .from('manuals')
        .select('id,title,document_number,version,status,summary,updated_at')
        .eq('status', 'PUBLISHED')
        .order('updated_at', { ascending: false });

    if (searchText) {
        const escaped = searchText.replace(/[%,]/g, ' ').trim();
        query = query.or(`title.ilike.%${escaped}%,document_number.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row) => normalizeRow(row));
};

export const getPublishedManualById = async (id) => {
    assertSupabaseConfigured();
    const { data, error } = await supabase
        .from('manuals')
        .select('*')
        .eq('id', id)
        .eq('status', 'PUBLISHED')
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return normalizeRow(data);
};

export const parseManualIdFromQrText = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
    const extractUuid = (text) => {
        const match = String(text || '').match(uuidPattern);
        return match?.[0] || null;
    };

    const directUuid = extractUuid(raw);
    if (directUuid) return directUuid;

    try {
        const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const parsed = new URL(withProtocol);

        const candidates = [
            decodeURIComponent(parsed.hash || ''),
            decodeURIComponent(parsed.pathname || ''),
            decodeURIComponent(parsed.search || '')
        ];

        for (const candidate of candidates) {
            const found = extractUuid(candidate);
            if (found) return found;
        }

        const hash = parsed.hash || '';
        const hashMatch = hash.match(/\/(?:manual|manuals|sop)\/([^?/#]+)/i);
        if (hashMatch?.[1]) return decodeURIComponent(hashMatch[1]);

        const pathMatch = parsed.pathname.match(/\/(?:manual|manuals|sop)\/([^?/#]+)/i);
        if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);

        const manualParam = parsed.searchParams.get('manualId')
            || parsed.searchParams.get('manual')
            || parsed.searchParams.get('manual_id')
            || parsed.searchParams.get('id');
        if (manualParam) return manualParam;
    } catch {
        // ignore
    }

    return null;
};
