import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Save, Settings, TestTube2 } from 'lucide-react';
import { getRuntimeConfig, runtimeConfigDefaults, saveRuntimeConfig } from '../lib/runtimeConfig';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getCaptureSupabaseClient } from '../lib/captureSupabase';

const SettingsPage = () => {
    const initial = useMemo(() => getRuntimeConfig(), []);
    const [form, setForm] = useState(initial);
    const [message, setMessage] = useState('');
    const [isTestingSupabase, setIsTestingSupabase] = useState(false);
    const [isTestingGoogleSheet, setIsTestingGoogleSheet] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

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

    const handleTestSupabase = async () => {
        setMessage('');
        if (!form.supabaseUrl || !form.supabaseAnonKey || !form.supabaseCaptureTable) {
            setMessage('Isi dulu Supabase URL, Anon Key, dan nama tabel capture.');
            return;
        }

        setIsTestingSupabase(true);
        try {
            const client = getCaptureSupabaseClient({
                supabaseUrl: form.supabaseUrl,
                supabaseAnonKey: form.supabaseAnonKey
            });

            if (!client) {
                throw new Error('Konfigurasi Supabase tidak valid.');
            }

            const { error } = await client
                .from(form.supabaseCaptureTable)
                .select('*', { count: 'exact', head: true })
                .limit(1);

            if (error) throw error;
            setMessage('✅ Test koneksi Supabase sukses.');
        } catch (err) {
            setMessage(`❌ Test koneksi Supabase gagal: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsTestingSupabase(false);
        }
    };

    const handleTestGoogleSheet = async () => {
        setMessage('');
        if (!form.googleSheetWebhookUrl) {
            setMessage('Isi dulu Google Sheet Webhook URL.');
            return;
        }

        setIsTestingGoogleSheet(true);
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
            setIsTestingGoogleSheet(false);
        }
    };

    const handleLogout = async () => {
        if (!isSupabaseConfigured || !supabase) {
            setMessage('Supabase belum dikonfigurasi, logout tidak diperlukan.');
            return;
        }

        setIsLoggingOut(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (err) {
            setMessage(`❌ Logout gagal: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-card">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Settings size={14} />
                    Settings
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight text-white">Konfigurasi Data Capture</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Atur Supabase dan Google Sheet untuk menyimpan log scan + step yang dibuka.
                </p>
            </header>

            <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-card">
                <h2 className="m-0 text-base font-bold text-slate-200">Metadata Operator</h2>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Nama Operator</label>
                    <input
                        type="text"
                        value={form.operatorName}
                        onChange={(e) => update('operatorName', e.target.value)}
                        placeholder="Operator name"
                        className="min-h-[46px] w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Device Label</label>
                    <input
                        type="text"
                        value={form.deviceLabel}
                        onChange={(e) => update('deviceLabel', e.target.value)}
                        placeholder="Device label (contoh: HP-LINE-1)"
                        className="min-h-[46px] w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-glow-emerald">
                <div className="flex items-center justify-between gap-2 border-b border-emerald-500/15 pb-3">
                    <h2 className="m-0 text-base font-bold text-emerald-400">Supabase Capture</h2>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-300">
                        <input
                            type="checkbox"
                            checked={form.supabaseCaptureEnabled}
                            onChange={(e) => update('supabaseCaptureEnabled', e.target.checked)}
                            className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        Aktif
                    </label>
                </div>
                <div className="space-y-3 pt-1">
                    <input
                        type="text"
                        value={form.supabaseUrl}
                        onChange={(e) => update('supabaseUrl', e.target.value)}
                        placeholder="Supabase URL"
                        className="min-h-[46px] w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                        type="password"
                        value={form.supabaseAnonKey}
                        onChange={(e) => update('supabaseAnonKey', e.target.value)}
                        placeholder="Supabase Anon Key"
                        className="min-h-[46px] w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                        type="text"
                        value={form.supabaseCaptureTable}
                        onChange={(e) => update('supabaseCaptureTable', e.target.value)}
                        placeholder="Nama tabel capture (opsional)"
                        className="min-h-[46px] w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />

                    <button
                        onClick={handleTestSupabase}
                        disabled={isTestingSupabase}
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-60"
                    >
                        <TestTube2 size={16} />
                        {isTestingSupabase ? 'Testing...' : 'Test Connection'}
                    </button>
                </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 shadow-glow">
                <div className="flex items-center justify-between gap-2 border-b border-cyan-500/15 pb-3">
                    <h2 className="m-0 text-base font-bold text-cyan-400">Google Sheet Capture</h2>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-300">
                        <input
                            type="checkbox"
                            checked={form.googleSheetCaptureEnabled}
                            onChange={(e) => update('googleSheetCaptureEnabled', e.target.checked)}
                            className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                        />
                        Aktif
                    </label>
                </div>
                <div className="space-y-3 pt-1">
                    <input
                        type="text"
                        value={form.googleSheetWebhookUrl}
                        onChange={(e) => update('googleSheetWebhookUrl', e.target.value)}
                        placeholder="Google Apps Script Web App URL"
                        className="min-h-[46px] w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />

                    <button
                        onClick={handleTestGoogleSheet}
                        disabled={isTestingGoogleSheet}
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-400 transition hover:bg-cyan-500/20 disabled:opacity-60"
                    >
                        <TestTube2 size={16} />
                        {isTestingGoogleSheet ? 'Testing...' : 'Test Connection'}
                    </button>
                </div>
            </section>

            {message ? (
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm font-medium text-slate-300">{message}</div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                    onClick={handleReset}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-700"
                >
                    Reset
                </button>
                <button
                    onClick={handleSave}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-bold text-white shadow-glow transition-all duration-200 hover:from-cyan-300 hover:to-blue-400"
                >
                    <Save size={16} />
                    Simpan
                </button>
            </div>

            <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-60"
            >
                <LogOut size={16} />
                {isLoggingOut ? 'Memproses logout...' : 'Logout'}
            </button>
        </div>
    );
};

export default SettingsPage;
