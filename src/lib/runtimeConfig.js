const STORAGE_KEY = 'mavi-mobile-runtime-config-v1';

const DEFAULTS = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    supabaseCaptureTable: 'scan_captures',
    supabaseCaptureEnabled: true,
    googleSheetWebhookUrl: '',
    googleSheetCaptureEnabled: false,
    operatorName: '',
    deviceLabel: ''
};

const normalize = (value) => {
    if (!value || typeof value !== 'object') return { ...DEFAULTS };

    return {
        supabaseUrl: String(value.supabaseUrl || DEFAULTS.supabaseUrl).trim(),
        supabaseAnonKey: String(value.supabaseAnonKey || DEFAULTS.supabaseAnonKey).trim(),
        supabaseCaptureTable: String(value.supabaseCaptureTable || DEFAULTS.supabaseCaptureTable).trim() || DEFAULTS.supabaseCaptureTable,
        supabaseCaptureEnabled: value.supabaseCaptureEnabled ?? DEFAULTS.supabaseCaptureEnabled,
        googleSheetWebhookUrl: String(value.googleSheetWebhookUrl || DEFAULTS.googleSheetWebhookUrl).trim(),
        googleSheetCaptureEnabled: value.googleSheetCaptureEnabled ?? DEFAULTS.googleSheetCaptureEnabled,
        operatorName: String(value.operatorName || DEFAULTS.operatorName).trim(),
        deviceLabel: String(value.deviceLabel || DEFAULTS.deviceLabel).trim()
    };
};

export const getRuntimeConfig = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            const normalizedDefaults = normalize(DEFAULTS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedDefaults));
            return normalizedDefaults;
        }
        const parsed = JSON.parse(raw);
        const normalized = normalize(parsed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
    } catch {
        const normalizedDefaults = normalize(DEFAULTS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedDefaults));
        return normalizedDefaults;
    }
};

export const saveRuntimeConfig = (partialConfig) => {
    const merged = normalize({
        ...getRuntimeConfig(),
        ...(partialConfig || {})
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
};

export const getCaptureConfig = () => {
    const config = getRuntimeConfig();

    const hasSupabaseKeys = Boolean(config.supabaseUrl && config.supabaseAnonKey && config.supabaseCaptureTable);
    const hasGoogleSheetWebhook = Boolean(config.googleSheetWebhookUrl);

    return {
        ...config,
        canUseSupabaseCapture: config.supabaseCaptureEnabled && hasSupabaseKeys,
        canUseGoogleSheetCapture: config.googleSheetCaptureEnabled && hasGoogleSheetWebhook
    };
};

export const runtimeConfigDefaults = { ...DEFAULTS };
