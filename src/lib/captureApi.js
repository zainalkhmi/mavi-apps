import { getCaptureConfig } from './runtimeConfig';
import { getCaptureSupabaseClient, isSupabaseTableMissingError } from './captureSupabase';
import {
    enqueueCaptureEvent,
    getPendingCaptureEvents,
    keepCaptureEventPending,
    markCaptureEventSynced
} from './captureLocalStore';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
let hasWarnedMissingCaptureTable = false;
let detectedMissingTableKey = '';
const MISSING_CAPTURE_TABLE_KEY_STORAGE = 'mavi-missing-capture-table-key';
const MISSING_TABLE_RECHECK_MS = 5 * 60 * 1000;
const PENDING_SYNC_BATCH_SIZE = 20;

let isSyncingPending = false;
let hasBoundOnlineListener = false;

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

const sendPayloadToTargets = async (payload) => {
    const results = await Promise.allSettled([
        sendToSupabase(payload),
        sendToGoogleSheet(payload)
    ]);

    const errors = results
        .filter((item) => item.status === 'rejected')
        .map((item) => item.reason);

    return { results, errors };
};

const bindOnlineSyncListener = () => {
    if (hasBoundOnlineListener || typeof window === 'undefined') return;

    window.addEventListener('online', () => {
        flushPendingCaptureEvents();
    });

    hasBoundOnlineListener = true;
};

export const flushPendingCaptureEvents = async () => {
    if (isSyncingPending) return { skipped: true, reason: 'sync_in_progress' };

    isSyncingPending = true;
    try {
        const pending = await getPendingCaptureEvents(PENDING_SYNC_BATCH_SIZE);
        if (!pending.length) return { ok: true, syncedCount: 0 };

        let syncedCount = 0;
        for (const item of pending) {
            const { errors } = await sendPayloadToTargets(item.payload);

            if (errors.length === 0) {
                await markCaptureEventSynced(item.id);
                syncedCount += 1;
            } else {
                const message = errors.map((err) => err?.message || String(err)).join(' | ');
                await keepCaptureEventPending(item.id, message);
            }
        }

        return { ok: true, syncedCount };
    } finally {
        isSyncingPending = false;
    }
};

const captureEvent = async (eventType, data) => {
    const payload = basePayload(eventType, data);
    bindOnlineSyncListener();

    let localId = null;
    try {
        localId = await enqueueCaptureEvent(payload);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[capture] Failed to write local event store:', err);
    }

    const { results, errors } = await sendPayloadToTargets(payload);

    if (localId) {
        if (errors.length === 0) {
            await markCaptureEventSynced(localId);
        } else {
            const message = errors.map((err) => err?.message || String(err)).join(' | ');
            await keepCaptureEventPending(localId, message);
        }
    }

    if (errors.length) {
        // eslint-disable-next-line no-console
        console.warn('[capture] One or more capture targets failed:', errors);
        flushPendingCaptureEvents();
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
