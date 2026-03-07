import { getCaptureConfig } from './runtimeConfig';
import { getCaptureSupabaseClient, isSupabaseTableMissingError } from './captureSupabase';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
let hasWarnedMissingCaptureTable = false;
let detectedMissingTableKey = '';
const MISSING_CAPTURE_TABLE_KEY_STORAGE = 'mavi-missing-capture-table-key';
const MISSING_TABLE_RECHECK_MS = 5 * 60 * 1000;

const getTableKey = (config) => `${config.supabaseUrl}::${config.supabaseCaptureTable}`;

const getStoredMissingTableMeta = () => {
    try {
        const raw = localStorage.getItem(MISSING_CAPTURE_TABLE_KEY_STORAGE);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const key = String(parsed?.key || '');
        const detectedAt = Number(parsed?.detectedAt || 0);
        if (!key || !Number.isFinite(detectedAt)) return null;

        if (Date.now() - detectedAt > MISSING_TABLE_RECHECK_MS) {
            localStorage.removeItem(MISSING_CAPTURE_TABLE_KEY_STORAGE);
            return null;
        }

        return { key, detectedAt };
    } catch {
        return null;
    }
};

const storeMissingTableKey = (value) => {
    try {
        if (!value) {
            localStorage.removeItem(MISSING_CAPTURE_TABLE_KEY_STORAGE);
            return;
        }
        localStorage.setItem(
            MISSING_CAPTURE_TABLE_KEY_STORAGE,
            JSON.stringify({
                key: value,
                detectedAt: Date.now()
            })
        );
    } catch {
        // ignore storage error
    }
};

const basePayload = (eventType, data = {}) => {
    const config = getCaptureConfig();

    return {
        eventType,
        timestamp: new Date().toISOString(),
        appVersion: APP_VERSION,
        operatorName: config.operatorName || null,
        deviceLabel: config.deviceLabel || null,
        ...data
    };
};

const sendToSupabase = async (payload) => {
    const config = getCaptureConfig();
    if (!config.canUseSupabaseCapture) return { skipped: true, reason: 'Supabase capture disabled or incomplete config' };

    const storedMissingMeta = getStoredMissingTableMeta();
    const storedMissingTableKey = storedMissingMeta?.key || '';
    if (storedMissingTableKey && storedMissingTableKey !== getTableKey(config)) {
        detectedMissingTableKey = '';
        hasWarnedMissingCaptureTable = false;
        storeMissingTableKey('');
    }

    const tableKey = getTableKey(config);
    if (detectedMissingTableKey && detectedMissingTableKey === tableKey) {
        return { skipped: true, reason: 'Supabase capture table previously marked missing' };
    }
    if (storedMissingTableKey && storedMissingTableKey === tableKey) {
        detectedMissingTableKey = tableKey;
        return { skipped: true, reason: 'Supabase capture table previously marked missing (persisted)' };
    }

    const client = getCaptureSupabaseClient({
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey
    });
    if (!client) return { skipped: true, reason: 'Invalid Supabase config' };

    const row = {
        event_type: payload.eventType,
        occurred_at: payload.timestamp,
        manual_id: payload.manualId || null,
        manual_title: payload.manualTitle || null,
        step_index: Number.isFinite(payload.stepIndex) ? payload.stepIndex : null,
        step_title: payload.stepTitle || null,
        source: payload.source || null,
        operator_name: payload.operatorName || null,
        device_label: payload.deviceLabel || null,
        app_version: payload.appVersion,
        payload_json: payload
    };

    const { error } = await client.from(config.supabaseCaptureTable).insert(row);
    if (error) {
        if (isSupabaseTableMissingError(error)) {
            detectedMissingTableKey = tableKey;
            storeMissingTableKey(tableKey);
            if (!hasWarnedMissingCaptureTable) {
                hasWarnedMissingCaptureTable = true;
                // eslint-disable-next-line no-console
                console.warn(`[capture] Supabase table '${config.supabaseCaptureTable}' belum ada / tidak bisa diakses. Capture ke Supabase dilewati.`);
            }
            return { skipped: true, reason: 'Supabase capture table missing' };
        }

        throw error;
    }

    if (storedMissingTableKey && storedMissingTableKey === tableKey) {
        storeMissingTableKey('');
    }

    return { ok: true };
};

const sendToGoogleSheet = async (payload) => {
    const config = getCaptureConfig();
    if (!config.canUseGoogleSheetCapture) return { skipped: true, reason: 'Google Sheet capture disabled or webhook empty' };

    const response = await fetch(config.googleSheetWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Google Sheet webhook failed with status ${response.status}`);
    }

    return { ok: true };
};

const captureEvent = async (eventType, data) => {
    const payload = basePayload(eventType, data);

    const results = await Promise.allSettled([
        sendToSupabase(payload),
        sendToGoogleSheet(payload)
    ]);

    const errors = results
        .filter((item) => item.status === 'rejected')
        .map((item) => item.reason);

    if (errors.length) {
        // eslint-disable-next-line no-console
        console.warn('[capture] One or more capture targets failed:', errors);
    }

    return results;
};

export const captureScanDetected = async ({ manualId, qrRawValue, source = 'scan' }) => {
    return captureEvent('scan_detected', {
        manualId,
        source,
        qrRawValue: qrRawValue || null
    });
};

export const captureStepViewed = async ({ manualId, manualTitle, stepIndex, stepTitle, source = 'viewer' }) => {
    return captureEvent('step_viewed', {
        manualId,
        manualTitle: manualTitle || null,
        stepIndex,
        stepTitle: stepTitle || null,
        source
    });
};

export const captureRunStarted = async ({ runId, manualId, manualTitle, source = 'viewer' }) => {
    return captureEvent('run_started', {
        runId,
        manualId,
        manualTitle: manualTitle || null,
        source
    });
};

export const captureStepChecked = async ({ runId, manualId, manualTitle, stepIndex, stepTitle, resultStatus, source = 'viewer' }) => {
    return captureEvent('step_checked', {
        runId,
        manualId,
        manualTitle: manualTitle || null,
        stepIndex,
        stepTitle: stepTitle || null,
        resultStatus: resultStatus || 'na',
        source
    });
};

export const captureRunCompleted = async ({ runId, manualId, manualTitle, source = 'viewer' }) => {
    return captureEvent('run_completed', {
        runId,
        manualId,
        manualTitle: manualTitle || null,
        source
    });
};
