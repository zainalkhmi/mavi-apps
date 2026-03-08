import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Clock3,
    Database,
    RefreshCcw
} from 'lucide-react';
import { flushPendingCaptureEvents } from '../lib/captureApi';
import { clearSyncedCaptureEvents, listCaptureEvents } from '../lib/captureLocalStore';
import { listRecentRuns } from '../lib/executionApi';

const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('id-ID');
};

const DataPage = () => {
    const [rows, setRows] = useState([]);
    const [runRows, setRunRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [runMessage, setRunMessage] = useState('');

    const loadData = useCallback(async () => {
        setMessage('');
        setLoading(true);
        try {
            try {
                await flushPendingCaptureEvents();
            } catch {
                // ignore flush error, local list tetap ditampilkan
            }

            await clearSyncedCaptureEvents();

            const localRows = await listCaptureEvents(100);
            const pendingRows = (localRows || []).filter((item) => item?.status !== 'synced');
            setRows(pendingRows);
            if (!pendingRows.length) {
                setMessage('Tidak ada antrean capture. Semua data sudah ter-upload.');
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
            setMessage(`Gagal memuat data capture lokal: ${err?.message || 'Unknown error'}`);
            setRunRows([]);
            setRunMessage('');
        } finally {
            setLoading(false);
        }
    }, []);

    const stats = useMemo(() => {
        const total = rows.length;
        return { total, pending: total };
    }, [rows]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-card">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    <Database size={14} />
                    Data Capture
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight text-white">Data</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Menampilkan antrean capture lokal yang belum ter-upload (pending) dari perangkat (IndexedDB).
                </p>
            </header>

            <section className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center text-xs shadow-card">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className="m-0 mb-1 inline-flex items-center gap-1 font-semibold text-slate-500"><Database size={14} /> Total</p>
                    <p className="m-0 text-xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <p className="m-0 mb-1 inline-flex items-center gap-1 font-semibold text-amber-400"><Clock3 size={14} /> Pending</p>
                    <p className="m-0 text-xl font-bold text-amber-400">{stats.pending}</p>
                </div>
            </section>

            <div className="flex justify-end">
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-60"
                >
                    <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Memuat...' : 'Refresh Data'}
                </button>
            </div>

            {message ? (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm font-medium text-cyan-300">{message}</div>
            ) : null}

            <div className="space-y-3">
                {rows.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-card">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
                            <p className="m-0 text-sm font-bold text-slate-100">{item?.payload?.eventType || '-'}</p>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                                    <span className="inline-flex items-center gap-1"><Clock3 size={10} /> pending</span>
                                </span>
                                <p className="m-0 text-xs font-medium text-slate-600">{formatDateTime(item?.payload?.timestamp || item?.createdAt)}</p>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs text-slate-500">
                            <p className="m-0">manualId: <strong className="font-semibold text-slate-300">{item?.payload?.manualId || '-'}</strong></p>
                            <p className="m-0">manualTitle: <strong className="font-semibold text-slate-300">{item?.payload?.manualTitle || '-'}</strong></p>
                            <p className="m-0">step: <strong className="font-semibold text-slate-300">{Number.isFinite(item?.payload?.stepIndex) ? item.payload.stepIndex : '-'}</strong> • <span className="font-medium text-slate-300">{item?.payload?.stepTitle || '-'}</span></p>
                            <p className="m-0">source: <strong className="font-semibold text-slate-300">{item?.payload?.source || '-'}</strong></p>
                            <p className="m-0">operator/device: <strong className="font-semibold text-slate-300">{item?.payload?.operatorName || '-'} / {item?.payload?.deviceLabel || '-'}</strong></p>
                            <p className="m-0">appVersion: <strong className="font-semibold text-slate-300">{item?.payload?.appVersion || '-'}</strong></p>
                            {item?.lastError ? (
                                <p className="m-0 mt-2 rounded border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300">lastError: <span className="font-medium">{item.lastError}</span></p>
                            ) : null}
                        </div>
                    </article>
                ))}
            </div>

            <section className="mt-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-card">
                <h2 className="m-0 border-b border-slate-700/50 pb-2 text-sm font-bold text-slate-200">Run Summary (20 terbaru)</h2>
                {runMessage ? (
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm font-medium text-cyan-300">{runMessage}</div>
                ) : null}

                {runRows.map((run) => (
                    <article key={run.id} className="rounded-2xl border border-slate-700 bg-slate-800 p-4 transition hover:border-slate-600">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
                            <p className="m-0 text-sm font-bold text-slate-100">{run.manual_title || run.manual_id || '-'}</p>
                            <p className="m-0 rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{run.status || '-'}</p>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs text-slate-500">
                            <p className="m-0">manualId: <strong className="font-semibold text-slate-300">{run.manual_id || '-'}</strong></p>
                            <p className="m-0">version/source: <strong className="font-semibold text-slate-300">{run.manual_version || '-'} / {run.source || '-'}</strong></p>
                            <p className="m-0">operator/device: <strong className="font-semibold text-slate-300">{run.operator_name || '-'} / {run.device_label || '-'}</strong></p>
                            <p className="m-0">started: <span className="font-medium text-slate-400">{formatDateTime(run.started_at)}</span></p>
                            <p className="m-0">completed: <span className="font-medium text-slate-400">{formatDateTime(run.completed_at)}</span></p>
                        </div>
                    </article>
                ))}
            </section>
        </div>
    );
};

export default DataPage;
