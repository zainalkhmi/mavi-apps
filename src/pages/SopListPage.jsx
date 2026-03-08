import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedManualSummaries } from '../lib/manualApi';

const SopListPage = () => {
    const [search, setSearch] = useState('');
    const [manuals, setManuals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(10);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isLoading) {
            setLoadingProgress(100);
            return;
        }

        setLoadingProgress((prev) => (prev > 12 ? prev : 12));
        const timer = setInterval(() => {
            setLoadingProgress((prev) => {
                if (prev >= 92) return prev;
                const step = Math.max(2, Math.round((100 - prev) / 12));
                return Math.min(prev + step, 92);
            });
        }, 140);

        return () => clearInterval(timer);
    }, [isLoading]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setLoadingProgress(12);
            setError('');
            try {
                const rows = await listPublishedManualSummaries(search);
                if (!cancelled) setManuals(rows);
            } catch (err) {
                if (!cancelled) {
                    setError('Gagal memuat SOP. Periksa koneksi atau Supabase config.');
                }
                // eslint-disable-next-line no-console
                console.error('List SOP error:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        const timer = setTimeout(load, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search]);

    const totalText = useMemo(() => `${manuals.length} SOP ditemukan`, [manuals.length]);

    return (
        <div className="space-y-4 pb-4">
            <header className="px-1 pt-2">
                <h1 className="m-0 text-2xl font-bold tracking-tight text-white">Daftar SOP</h1>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                    Hanya SOP dengan status PUBLISHED yang ditampilkan.
                </p>
            </header>

            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-card">
                <label htmlFor="searchSop" className="text-sm font-semibold text-slate-400">
                    Cari judul / nomor dokumen
                </label>
                <input
                    id="searchSop"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Contoh: Assembly / WI-001"
                    className="min-h-[46px] w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
                <small className="mt-1 block text-xs font-medium text-slate-600">{totalText}</small>
            </div>

            {isLoading ? (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-cyan-300 shadow-glow">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">Memuat SOP dari server...</span>
                        <span className="text-xs font-bold text-cyan-400">{Math.round(loadingProgress)}%</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-[width] duration-200"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                </div>
            ) : null}
            {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 shadow-glow-rose">{error}</div> : null}

            {!isLoading && !error ? (
                <div className="grid gap-3">
                    {manuals.map((manual) => (
                        <Link
                            key={manual.id}
                            className="relative min-h-[130px] rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-card transition-all duration-200 hover:border-cyan-500/30 hover:shadow-glow"
                            to={`/sop/${encodeURIComponent(manual.id)}`}
                        >
                            <div className="min-w-0 pr-14">
                                <strong className="block truncate text-lg font-bold leading-tight text-slate-100">
                                    {manual.title || 'Untitled SOP'}
                                </strong>
                                <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{manual.summary || 'Tanpa ringkasan'}</p>
                            </div>

                            <span className="absolute bottom-4 right-4 inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                                v{manual.version || '1.0'}
                            </span>
                        </Link>
                    ))}

                    {!manuals.length ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-sm font-medium text-slate-600">
                            Tidak ada SOP published yang cocok dengan pencarian.
                        </div>
                    ) : null}
                </div>
            ) : null}

        </div>
    );
};

export default SopListPage;
