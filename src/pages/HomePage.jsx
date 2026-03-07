import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenText, QrCode, Sparkles } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

const HomePage = () => {
    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass backdrop-blur">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-yellow-300/20 px-3 py-1 text-xs font-semibold text-yellow-300">
                    <Sparkles size={14} />
                    MAVI MOBILE
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight">SOP Reader</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Akses SOP paling cepat lewat scan QR atau pilih dari katalog.
                </p>
            </header>

            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/90 via-slate-900 to-black p-4 shadow-glass">
                <h2 className="m-0 text-base font-semibold">Mobile Workspace</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    UI modern, fokus operator, dan navigasi satu tangan dengan tombol scan di tengah bawah.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200">Realtime</span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200">Mobile First</span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200">Published SOP</span>
                </div>
            </section>

            <main className="grid gap-3">
                {!isSupabaseConfigured ? (
                    <div className="rounded-2xl border border-rose-400/35 bg-rose-950/40 p-3 text-sm text-rose-200">
                        Supabase belum dikonfigurasi. Isi file <code>mavi-mobile-reader/.env</code> dengan
                        <code> VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>, lalu restart server.
                    </div>
                ) : null}

                <Link
                    className="rounded-3xl border border-yellow-300/30 bg-gradient-to-br from-yellow-300/20 to-orange-300/15 p-4 shadow-glass"
                    to="/scan"
                >
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-base font-semibold text-yellow-200">
                            <QrCode size={18} />
                            Scan QR SOP
                        </span>
                        <span className="text-xs text-slate-300">Quick Access</span>
                    </div>
                    <p className="m-0 text-sm text-slate-200">Arahkan kamera untuk langsung membuka SOP dari QR.</p>
                </Link>

                <Link className="rounded-3xl border border-white/15 bg-white/5 p-4 shadow-glass" to="/sop">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-base font-semibold">
                            <BookOpenText size={18} />
                            List SOP
                        </span>
                        <span className="text-xs text-slate-300">Browse</span>
                    </div>
                    <p className="m-0 text-sm text-slate-300">Lihat seluruh dokumen PUBLISHED dan buka langkah kerja.</p>
                </Link>
            </main>
        </div>
    );
};

export default HomePage;
