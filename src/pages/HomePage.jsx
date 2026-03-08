import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenText, QrCode, Sparkles } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

const HomePage = () => {
    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-card">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    <Sparkles size={14} />
                    MAVI MOBILE
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight text-white">SOP Reader</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Akses SOP paling cepat lewat scan QR atau pilih dari katalog.
                </p>
            </header>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-card">
                <h2 className="m-0 text-sm font-semibold text-slate-300">Mobile Workspace</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    UI modern, fokus operator, dan navigasi satu tangan dengan tombol scan di tengah bawah.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-400">Realtime</span>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-400">Mobile First</span>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-400">Published SOP</span>
                </div>
            </section>

            <main className="grid gap-3">
                {!isSupabaseConfigured ? (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 shadow-glow-rose">
                        Supabase belum dikonfigurasi. Isi <code className="text-rose-200">VITE_SUPABASE_URL</code> (format: <code className="text-rose-200">https://&lt;project-ref&gt;.supabase.co</code>)
                        dan <code className="text-rose-200">VITE_SUPABASE_ANON_KEY</code> di environment, lalu restart/redeploy app.
                    </div>
                ) : null}

                <Link
                    className="group rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-4 shadow-card transition-all duration-200 hover:border-cyan-500/40 hover:shadow-glow"
                    to="/scan"
                >
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-base font-bold text-cyan-400">
                            <QrCode size={18} />
                            Scan QR SOP
                        </span>
                        <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">Quick Access</span>
                    </div>
                    <p className="m-0 text-sm text-slate-400">Arahkan kamera untuk langsung membuka SOP dari QR.</p>
                </Link>

                <Link className="group rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-card transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/80" to="/sop">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-base font-bold text-slate-200">
                            <BookOpenText size={18} />
                            List SOP
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Browse</span>
                    </div>
                    <p className="m-0 text-sm text-slate-500">Lihat seluruh dokumen PUBLISHED dan buka langkah kerja.</p>
                </Link>
            </main>
        </div>
    );
};

export default HomePage;
