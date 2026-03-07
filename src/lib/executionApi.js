import { getRuntimeConfig } from './runtimeConfig';
import { assertSupabaseConfigured, supabase } from './supabase';

const TABLE_RUNS = 'manual_runs';
const TABLE_RUN_STEPS = 'manual_run_steps';
const missingTableKeys = new Set();

const getTableKey = () => `${import.meta.env.VITE_SUPABASE_URL || 'local'}::${TABLE_RUNS},${TABLE_RUN_STEPS}`;

const createMissingTablesError = () => {
    const err = new Error("Tabel eksekusi SOP belum tersedia. Jalankan file SQL: sql/manual_execution_schema.sql");
    err.code = 'MAVI_EXECUTION_TABLE_MISSING';
    return err;
};

const isMissingTableError = (error) => {
    const status = Number(error?.status || error?.statusCode);
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();

    if (status === 404) return true;
    if (code === 'PGRST205') return true;
    if (message.includes('relation') && message.includes('does not exist')) return true;
    if (message.includes('could not find') && message.includes('table')) return true;

    return false;
};

const getActorMeta = async () => {
    const config = getRuntimeConfig();
    let userId = null;

    try {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
    } catch {
        userId = null;
    }

    return {
        operatorId: userId,
        operatorName: config.operatorName || null,
        deviceLabel: config.deviceLabel || null
    };
};

export const createRun = async (manual, source = 'viewer') => {
    assertSupabaseConfigured();
    if (missingTableKeys.has(getTableKey())) throw createMissingTablesError();

    const actor = await getActorMeta();
    const payload = {
        manual_id: manual?.id,
        manual_title: manual?.title || null,
        manual_version: manual?.version || null,
        operator_id: actor.operatorId,
        operator_name: actor.operatorName,
        device_label: actor.deviceLabel,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        source
    };

    const { data, error } = await supabase.from(TABLE_RUNS).insert(payload).select('*').single();
    if (error) {
        if (isMissingTableError(error)) {
            missingTableKeys.add(getTableKey());
            throw createMissingTablesError();
        }
        throw error;
    }
    return data;
};

export const upsertRunStep = async ({
    runId,
    stepIndex,
    stepTitle,
    isChecked,
    inputNumber,
    resultStatus,
    noteText,
    evidenceImageUrl
}) => {
    assertSupabaseConfigured();
    if (missingTableKeys.has(getTableKey())) throw createMissingTablesError();

    const payload = {
        run_id: runId,
        step_index: stepIndex,
        step_title: stepTitle || null,
        is_checked: Boolean(isChecked),
        check_time: isChecked ? new Date().toISOString() : null,
        input_number: Number.isFinite(inputNumber) ? inputNumber : null,
        result_status: resultStatus || 'na',
        note_text: noteText || null,
        evidence_image_url: evidenceImageUrl || null
    };

    const { data, error } = await supabase
        .from(TABLE_RUN_STEPS)
        .upsert(payload, { onConflict: 'run_id,step_index' })
        .select('*')
        .single();

    if (!error) return data;

    if (isMissingTableError(error)) {
        missingTableKeys.add(getTableKey());
        throw createMissingTablesError();
    }

    const message = String(error?.message || '').toLowerCase();
    const isOnConflictConstraintMissing = message.includes('no unique or exclusion constraint');
    if (!isOnConflictConstraintMissing) throw error;

    const { data: existing, error: existingError } = await supabase
        .from(TABLE_RUN_STEPS)
        .select('id')
        .eq('run_id', runId)
        .eq('step_index', stepIndex)
        .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.id) {
        const { data: updated, error: updateError } = await supabase
            .from(TABLE_RUN_STEPS)
            .update(payload)
            .eq('id', existing.id)
            .select('*')
            .single();

        if (updateError) throw updateError;
        return updated;
    }

    const { data: inserted, error: insertError } = await supabase
        .from(TABLE_RUN_STEPS)
        .insert(payload)
        .select('*')
        .single();

    if (insertError) throw insertError;
    return inserted;
};

export const updateRunStatus = async (runId, status) => {
    assertSupabaseConfigured();
    if (missingTableKeys.has(getTableKey())) throw createMissingTablesError();

    const normalized = String(status || '').toLowerCase();
    const nextStatus = ['in_progress', 'completed', 'aborted'].includes(normalized)
        ? normalized
        : 'in_progress';

    const payload = {
        status: nextStatus,
        completed_at: nextStatus === 'completed' || nextStatus === 'aborted' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase.from(TABLE_RUNS).update(payload).eq('id', runId).select('*').single();
    if (error) {
        if (isMissingTableError(error)) {
            missingTableKeys.add(getTableKey());
            throw createMissingTablesError();
        }
        throw error;
    }
    return data;
};

export const listRecentRuns = async (limit = 20) => {
    assertSupabaseConfigured();
    if (missingTableKeys.has(getTableKey())) {
        return { rows: [], tableMissing: true };
    }

    const { data, error } = await supabase
        .from(TABLE_RUNS)
        .select('id,manual_id,manual_title,manual_version,operator_name,device_label,started_at,completed_at,status,source')
        .order('started_at', { ascending: false })
        .limit(limit);

    if (error) {
        if (isMissingTableError(error)) {
            missingTableKeys.add(getTableKey());
            return { rows: [], tableMissing: true };
        }
        throw error;
    }

    return { rows: data || [], tableMissing: false };
};

export const executionTableNames = {
    runs: TABLE_RUNS,
    runSteps: TABLE_RUN_STEPS
};

export const isExecutionTableMissingError = isMissingTableError;