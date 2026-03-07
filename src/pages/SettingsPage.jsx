import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Settings, TestTube2 } from 'lucide-react';
import { getRuntimeConfig, runtimeConfigDefaults, saveRuntimeConfig } from '../lib/runtimeConfig';

const SettingsPage = () => {
    const initial = useMemo(() => getRuntimeConfig(), []);
    const [form, setForm] = useState(initial);
    const [message, setMessage] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    const update = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        const saved = saveRuntimeConfig(form);
        setForm(saved);
        setMessage('✅ Konfigurasi berhasil disimpan di perangkat ini.');
    };

    const handleReset = () => {
        setForm(runtimeConfigDefaults);
        saveRuntimeConfig(runtimeConfigDefaults);
        setMessage('♻️ Konfigurasi direset ke default.');
    };

    const handleTestGoogleSheet = async () => {
        setMessage('');
        if (!form.googleSheetWebhookUrl) {
            setMessage('Isi dulu Google Sheet Webhook URL.');
            return;
        }

        setIsTesting(true);
        try {
            const res = await fetch(form.googleSheetWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'test_ping',
                    timestamp: new Date().toISOString(),
                    message: 'MAVI mobile test payload'
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setMessage('✅ Test webhook Google Sheet sukses.');
        } catch (err) {
            setMessage(`❌ Test webhook gagal: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass backdrop-blur">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-yellow-300/20 px-3 py-1 text-xs font-semibold text-yellow-300">
                    <Settings size={14} />
                    Settings
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight">Konfigurasi Data Capture</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Atur Supabase dan Google Sheet untuk menyimpan log scan + step yang dibuka.
                </p>
            </header>

            <section className="space-y-3 rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass">
                <h2 className="m-0 text-base font-semibold text-yellow-100">Metadata Operator</h2>
                <input
                    type="text"
                    value={form.operatorName}
                    onChange={(e) => update('operatorName', e.target.value)}
                    placeholder="Operator name"
                    className="min-h-[44px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                />
                <input
                    type="text"
                    value={form.deviceLabel}
                    onChange={(e) => update('deviceLabel', e.target.value)}
                    placeholder="Device label (contoh: HP-LINE-1)"
                    className="min-h-[44px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                />
            </section>

            <section className="space-y-3 rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="m-0 text-base font-semibold text-yellow-100">Supabase Capture</h2>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                        <input
                            type="checkbox"
                            checked={form.supabaseCaptureEnabled}
                            onChange={(e) => update('supabaseCaptureEnabled', e.target.checked)}
                        />
                        Aktif
                    </label>
                </div>
                <input
                    type="text"
                    value={form.supabaseUrl}
                    onChange={(e) => update('supabaseUrl', e.target.value)}
                    placeholder="Supabase URL"
                    className="min-h-[44px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                />
                <input
                    type="text"
                    value={form.supabaseAnonKey}
                    onChange={(e) => update('supabaseAnonKey', e.target.value)}
                    placeholder="Supabase Anon Key"
                    className="min-h-[44px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                />
                <input
                    type="text"
                    value={form.supabaseCaptureTable}
                    onChange={(e) => update('supabaseCaptureTable', e.target.value)}
                    placeholder="Nama tabel capture (contoh: scan_captures)"
                    className="min-h-[44px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                />
            </section>

            <section className="space-y-3 rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="m-0 text-base font-semibold text-yellow-100">Google Sheet Capture</h2>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                        <input
                            type="checkbox"
                            checked={form.googleSheetCaptureEnabled}
                            onChange={(e) => update('googleSheetCaptureEnabled', e.target.checked)}
                        />
                        Aktif
                    </label>
                </div>

                <input
                    type="text"
                    value={form.googleSheetWebhookUrl}
                    onChange={(e) => update('googleSheetWebhookUrl', e.target.value)}
                    placeholder="Google Apps Script Web App URL"
                    className="min-h-[44px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                />

                <button
                    onClick={handleTestGoogleSheet}
                    disabled={isTesting}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-60"
                >
                    <TestTube2 size={16} />
                    {isTesting ? 'Testing...' : 'Test Webhook'}
                </button>
            </section>

            {message ? (
                <div className="rounded-2xl border border-white/20 bg-slate-900/60 p-3 text-sm text-slate-100">{message}</div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleSave}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-orange-300 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                    <Save size={16} />
                    Simpan
                </button>
                <button
                    onClick={handleReset}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
                >
                    Reset
                </button>
            </div>

            <Link
                to="/"
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-slate-200"
            >
                Kembali ke Home
            </Link>
        </div>
    );
};

export default SettingsPage;
