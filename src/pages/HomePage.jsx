import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenText, QrCode, Sparkles } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

const HomePage = () => {
    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    <Sparkles size={14} />
                    MAVI MOBILE
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-800">SOP Reader</h1>
                <p className="mt-2 text-sm text-slate-500">
                    Akses SOP paling cepat lewat scan QR atau pilih dari katalog.
                </p>
            </header>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-soft">
                <h2 className="m-0 text-base font-semibold text-slate-800">Mobile Workspace</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    UI modern, fokus operator, dan navigasi satu tangan dengan tombol scan di tengah bawah.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-subtle">Realtime</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-subtle">Mobile First</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-subtle">Published SOP</span>
                </div>
            </section>

            <main className="grid gap-3">
                {!isSupabaseConfigured ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
                        Supabase belum dikonfigurasi. Isi file <code>mavi-mobile-reader/.env</code> dengan
                        <code> VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>, lalu restart server.
                    </div>
                ) : null}

                <Link
                    className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-soft transition hover:shadow-md"
                    to="/scan"
                >
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-base font-semibold text-blue-600">
                            <QrCode size={18} />
                            Scan QR SOP
                        </span>
                        <span className="text-xs font-medium text-blue-400">Quick Access</span>
                    </div>
                    <p className="m-0 text-sm text-slate-600">Arahkan kamera untuk langsung membuka SOP dari QR.</p>
                </Link>

                <Link className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft transition hover:shadow-md" to="/sop">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-base font-semibold text-slate-700">
                            <BookOpenText size={18} />
                            List SOP
                        </span>
                        <span className="text-xs font-medium text-slate-400">Browse</span>
                    </div>
                    <p className="m-0 text-sm text-slate-500">Lihat seluruh dokumen PUBLISHED dan buka langkah kerja.</p>
                </Link>
            </main>
        </div>
    );
};

export default HomePage;
