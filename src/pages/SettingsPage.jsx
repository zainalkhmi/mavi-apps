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
            <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    <Settings size={14} />
                    Settings
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-800">Konfigurasi Data Capture</h1>
                <p className="mt-2 text-sm text-slate-500">
                    Atur Supabase dan Google Sheet untuk menyimpan log scan + step yang dibuka.
                </p>
            </header>

            <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                <h2 className="m-0 text-base font-bold text-slate-800">Metadata Operator</h2>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Nama Operator</label>
                    <input
                        type="text"
                        value={form.operatorName}
                        onChange={(e) => update('operatorName', e.target.value)}
                        placeholder="Operator name"
                        className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Device Label</label>
                    <input
                        type="text"
                        value={form.deviceLabel}
                        onChange={(e) => update('deviceLabel', e.target.value)}
                        placeholder="Device label (contoh: HP-LINE-1)"
                        className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </section>

            <section className="space-y-3 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-soft">
                <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                    <h2 className="m-0 text-base font-bold text-emerald-800">Supabase Capture</h2>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.supabaseCaptureEnabled}
                            onChange={(e) => update('supabaseCaptureEnabled', e.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
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
                        className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                        type="password"
                        value={form.supabaseAnonKey}
                        onChange={(e) => update('supabaseAnonKey', e.target.value)}
                        placeholder="Supabase Anon Key"
                        className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                        type="text"
                        value={form.supabaseCaptureTable}
                        onChange={(e) => update('supabaseCaptureTable', e.target.value)}
                        placeholder="Nama tabel capture (opsional)"
                        className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />

                    <button
                        onClick={handleTestSupabase}
                        disabled={isTestingSupabase}
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
                    >
                        <TestTube2 size={16} />
                        {isTestingSupabase ? 'Testing...' : 'Test Connection'}
                    </button>
                </div>
            </section>

            <section className="space-y-3 rounded-3xl border border-blue-100 bg-blue-50/50 p-5 shadow-soft">
                <div className="flex items-center justify-between gap-2 border-b border-blue-100 pb-2">
                    <h2 className="m-0 text-base font-bold text-blue-800">Google Sheet Capture</h2>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.googleSheetCaptureEnabled}
                            onChange={(e) => update('googleSheetCaptureEnabled', e.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                        className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />

                    <button
                        onClick={handleTestGoogleSheet}
                        disabled={isTestingGoogleSheet}
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:opacity-60"
                    >
                        <TestTube2 size={16} />
                        {isTestingGoogleSheet ? 'Testing...' : 'Test Connection'}
                    </button>
                </div>
            </section>

            {message ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 shadow-sm">{message}</div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                    onClick={handleReset}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                    Reset
                </button>
                <button
                    onClick={handleSave}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-blue-700"
                >
                    <Save size={16} />
                    Simpan
                </button>
            </div>

            <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
            >
                <LogOut size={16} />
                {isLoggingOut ? 'Memproses logout...' : 'Logout'}
            </button>
        </div>
    );
};

export default SettingsPage;
