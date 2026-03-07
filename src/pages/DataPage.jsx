import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, RefreshCcw } from 'lucide-react';
import { getCaptureConfig } from '../lib/runtimeConfig';
import { getCaptureSupabaseClient, isSupabaseTableMissingError } from '../lib/captureSupabase';
import { listRecentRuns } from '../lib/executionApi';

const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('id-ID');
};

const DataPage = () => {
    const captureConfig = useMemo(() => getCaptureConfig(), []);
    const [rows, setRows] = useState([]);
    const [runRows, setRunRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [runMessage, setRunMessage] = useState('');

    const canLoadData = captureConfig.canUseSupabaseCapture;

    const loadData = useCallback(async () => {
        setMessage('');
        if (!canLoadData) {
            setRows([]);
            setMessage('Supabase capture belum aktif. Atur dulu di menu Settings.');
            return;
        }

        setLoading(true);
        try {
            const client = getCaptureSupabaseClient({
                supabaseUrl: captureConfig.supabaseUrl,
                supabaseAnonKey: captureConfig.supabaseAnonKey
            });
            if (!client) throw new Error('Konfigurasi Supabase tidak valid.');

            const { data, error } = await client
                .from(captureConfig.supabaseCaptureTable)
                .select('id,event_type,occurred_at,manual_id,manual_title,step_index,step_title,source,operator_name,device_label,app_version')
                .order('occurred_at', { ascending: false })
                .limit(100);

            if (error) {
                if (isSupabaseTableMissingError(error)) {
                    setRows([]);
                    setMessage(`Tabel '${captureConfig.supabaseCaptureTable}' belum ada / tidak bisa diakses.`);
                    return;
                }
                throw error;
            }

            setRows(data || []);
            if (!data?.length) {
                setMessage('Belum ada data capture. Coba scan atau buka SOP dulu.');
            }

            try {
                const runResult = await listRecentRuns(20);
                setRunRows(runResult.rows || []);
                if (runResult.tableMissing) {
                    setRunMessage("Tabel 'manual_runs' belum ada / tidak bisa diakses. Jalankan sql/manual_execution_schema.sql.");
                } else if (!runResult.rows?.length) {
                    setRunMessage('Belum ada data execute run. Coba jalankan SOP dalam mode Execute.');
                } else {
                    setRunMessage('');
                }
            } catch (runErr) {
                setRunRows([]);
                setRunMessage(`Gagal memuat run summary: ${runErr?.message || 'Unknown error'}`);
            }
        } catch (err) {
            setRows([]);
            setMessage(`Gagal memuat data capture: ${err?.message || 'Unknown error'}`);
            setRunRows([]);
            setRunMessage('');
        } finally {
            setLoading(false);
        }
    }, [canLoadData, captureConfig.supabaseAnonKey, captureConfig.supabaseCaptureTable, captureConfig.supabaseUrl]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass backdrop-blur">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-yellow-300/20 px-3 py-1 text-xs font-semibold text-yellow-300">
                    <Database size={14} />
                    Data Capture
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight">Data</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Menampilkan 100 data capture terbaru dari tabel Supabase.
                </p>
            </header>

            <div className="flex justify-end">
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-slate-100 disabled:opacity-60"
                >
                    <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Memuat...' : 'Refresh Data'}
                </button>
            </div>

            {message ? (
                <div className="rounded-2xl border border-white/20 bg-slate-900/60 p-3 text-sm text-slate-100">{message}</div>
            ) : null}

            <div className="space-y-2">
                {rows.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-white/15 bg-white/5 p-3 shadow-glass">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="m-0 text-sm font-semibold text-yellow-200">{item.event_type || '-'}</p>
                            <p className="m-0 text-xs text-slate-300">{formatDateTime(item.occurred_at)}</p>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-300">
                            <p className="m-0">manualId: <span className="text-slate-100">{item.manual_id || '-'}</span></p>
                            <p className="m-0">manualTitle: <span className="text-slate-100">{item.manual_title || '-'}</span></p>
                            <p className="m-0">step: <span className="text-slate-100">{Number.isFinite(item.step_index) ? item.step_index : '-'}</span> • <span className="text-slate-100">{item.step_title || '-'}</span></p>
                            <p className="m-0">source: <span className="text-slate-100">{item.source || '-'}</span></p>
                            <p className="m-0">operator/device: <span className="text-slate-100">{item.operator_name || '-'} / {item.device_label || '-'}</span></p>
                            <p className="m-0">appVersion: <span className="text-slate-100">{item.app_version || '-'}</span></p>
                        </div>
                    </article>
                ))}
            </div>

            <section className="space-y-2 rounded-2xl border border-emerald-300/30 bg-emerald-950/20 p-3">
                <h2 className="m-0 text-sm font-semibold text-emerald-200">Run Summary (20 terbaru)</h2>
                {runMessage ? (
                    <div className="rounded-xl border border-white/20 bg-slate-900/60 p-3 text-sm text-slate-100">{runMessage}</div>
                ) : null}

                {runRows.map((run) => (
                    <article key={run.id} className="rounded-2xl border border-white/15 bg-white/5 p-3 shadow-glass">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="m-0 text-sm font-semibold text-emerald-200">{run.manual_title || run.manual_id || '-'}</p>
                            <p className="m-0 text-xs text-slate-300">{run.status || '-'}</p>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-300">
                            <p className="m-0">manualId: <span className="text-slate-100">{run.manual_id || '-'}</span></p>
                            <p className="m-0">version/source: <span className="text-slate-100">{run.manual_version || '-'} / {run.source || '-'}</span></p>
                            <p className="m-0">operator/device: <span className="text-slate-100">{run.operator_name || '-'} / {run.device_label || '-'}</span></p>
                            <p className="m-0">started: <span className="text-slate-100">{formatDateTime(run.started_at)}</span></p>
                            <p className="m-0">completed: <span className="text-slate-100">{formatDateTime(run.completed_at)}</span></p>
                        </div>
                    </article>
                ))}
            </section>
        </div>
    );
};

export default DataPage;
