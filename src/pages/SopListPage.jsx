import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedManualSummaries } from '../lib/manualApi';

const SopListPage = () => {
    const [search, setSearch] = useState('');
    const [manuals, setManuals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
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
        <div className="space-y-3 pb-4">
            <header className="px-1 pt-1">
                <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-100">Daftar SOP</h1>
                <p className="mt-1 text-sm leading-5 text-slate-300">
                    Hanya SOP dengan status PUBLISHED yang ditampilkan.
                </p>
            </header>

            <div className="space-y-1 rounded-2xl border border-[#1e3965] bg-[#0a1f43]/75 p-3">
                <label htmlFor="searchSop" className="text-sm font-medium text-slate-200">
                    Cari judul / nomor dokumen
                </label>
                <input
                    id="searchSop"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Contoh: Assembly / WI-001"
                    className="min-h-[38px] w-full rounded-lg border border-[#2a4b7e] bg-[#081734] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[#4f78b7]"
                />
                <small className="text-xs text-slate-400">{totalText}</small>
            </div>

            {isLoading ? <div className="rounded-xl border border-sky-400/35 bg-sky-950/35 p-3 text-sm text-sky-200">Memuat SOP...</div> : null}
            {error ? <div className="rounded-xl border border-rose-400/35 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div> : null}

            {!isLoading && !error ? (
                <div className="grid gap-2">
                    {manuals.map((manual) => (
                        <Link
                            key={manual.id}
                            className="relative min-h-[148px] rounded-2xl border border-[#1f3e6b] bg-[#081a3a] p-3 transition hover:bg-[#0a2147]"
                            to={`/sop/${encodeURIComponent(manual.id)}`}
                        >
                            <div className="min-w-0 pr-14">
                                <strong className="block truncate text-2xl font-bold leading-7 text-slate-100">
                                    {manual.title || 'Untitled SOP'}
                                </strong>
                                <p className="mt-1 text-base text-slate-300">{manual.summary || 'Tanpa ringkasan'}</p>
                            </div>

                            <span className="absolute bottom-3 right-3 text-sm text-slate-300">
                                v{manual.version || '1.0'}
                            </span>
                        </Link>
                    ))}

                    {!manuals.length ? (
                        <div className="rounded-2xl border border-[#1f3e6b] bg-[#081a3a] p-3 text-sm text-slate-300">
                            Tidak ada SOP published yang cocok dengan pencarian.
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
                <Link
                    to="/"
                    className="inline-flex min-h-[94px] items-start justify-start rounded-xl border border-[#1f3e6b] bg-[#071833] px-4 py-3 text-xl font-semibold text-slate-100"
                >
                    Kembali
                </Link>
                <Link
                    to="/scan"
                    className="inline-flex min-h-[94px] items-start justify-start rounded-xl border border-[#1f3e6b] bg-[#071833] px-4 py-3 text-xl font-semibold text-slate-100"
                >
                    Scan QR
                </Link>
            </div>
        </div>
    );
};

export default SopListPage;
