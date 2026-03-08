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
            <header className="px-2 pt-2">
                <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-800">Daftar SOP</h1>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                    Hanya SOP dengan status PUBLISHED yang ditampilkan.
                </p>
            </header>

            <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <label htmlFor="searchSop" className="text-sm font-medium text-slate-700">
                    Cari judul / nomor dokumen
                </label>
                <input
                    id="searchSop"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Contoh: Assembly / WI-001"
                    className="min-h-[46px] w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <small className="mt-1 block text-xs font-medium text-slate-400">{totalText}</small>
            </div>

            {isLoading ? (
                <div className="rounded-xl border border-sky-400/35 bg-sky-950/35 p-3 text-sm text-sky-200">
                    <div className="flex items-center justify-between gap-2">
                        <span>Memuat SOP dari server...</span>
                        <span className="text-xs font-semibold text-sky-100">{Math.round(loadingProgress)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-900/70">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-300 to-cyan-300 transition-[width] duration-200"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                </div>
            ) : null}
            {error ? <div className="rounded-xl border border-rose-400/35 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div> : null}

            {!isLoading && !error ? (
                <div className="grid gap-3">
                    {manuals.map((manual) => (
                        <Link
                            key={manual.id}
                            className="relative min-h-[140px] rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition hover:border-blue-300 hover:shadow-md"
                            to={`/sop/${encodeURIComponent(manual.id)}`}
                        >
                            <div className="min-w-0 pr-14">
                                <strong className="block truncate text-xl font-bold leading-tight text-slate-800">
                                    {manual.title || 'Untitled SOP'}
                                </strong>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{manual.summary || 'Tanpa ringkasan'}</p>
                            </div>

                            <span className="absolute bottom-4 right-4 inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                                v{manual.version || '1.0'}
                            </span>
                        </Link>
                    ))}

                    {!manuals.length ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-medium text-slate-500 shadow-inner">
                            Tidak ada SOP published yang cocok dengan pencarian.
                        </div>
                    ) : null}
                </div>
            ) : null}

        </div>
    );
};

export default SopListPage;
