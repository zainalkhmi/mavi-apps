import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, House, ListChecks } from 'lucide-react';
import { extractSteps, getPublishedManualById } from '../lib/manualApi';
import { captureStepViewed } from '../lib/captureApi';

const extractYouTubeVideoId = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    try {
        const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const parsed = new URL(withProtocol);
        const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

        if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
        if (host.includes('youtube.com')) {
            if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || null;
            if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
            if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
        }
    } catch {
        // fallback below
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : null;
};

const getYouTubeEmbedUrl = (value = '') => {
    const id = extractYouTubeVideoId(value);
    return id ? `https://www.youtube.com/embed/${id}` : null;
};

const SopViewerPage = () => {
    const { manualId } = useParams();
    const [manual, setManual] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!manualId) {
                setError('manualId tidak tersedia.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError('');
            try {
                const data = await getPublishedManualById(manualId);
                if (!cancelled) {
                    if (!data) {
                        setError('SOP tidak ditemukan atau belum PUBLISHED.');
                    } else {
                        setManual(data);
                        setCurrentStepIndex(0);
                    }
                }
            } catch (err) {
                if (!cancelled) setError('Gagal memuat SOP dari server.');
                // eslint-disable-next-line no-console
                console.error('Load SOP error:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [manualId]);

    const steps = useMemo(() => extractSteps(manual), [manual]);
    const currentStep = steps[currentStepIndex] || null;
    const progress = steps.length ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 0;

    useEffect(() => {
        if (isLoading || error || !manualId || !currentStep) return;

        captureStepViewed({
            manualId,
            manualTitle: manual?.title,
            stepIndex: currentStepIndex,
            stepTitle: currentStep?.title,
            source: 'viewer'
        });
    }, [isLoading, error, manualId, manual?.title, currentStepIndex, currentStep]);

    const renderMedia = () => {
        if (!currentStep) {
            return <div className="grid h-full min-h-[240px] place-items-center text-sm font-semibold text-slate-300">No step selected</div>;
        }
        const mediaUrl = currentStep?.media?.url || currentStep?.images?.[0];
        const mediaType = String(currentStep?.media?.type || '').toLowerCase();

        if (!mediaUrl) {
            return <div className="grid h-full min-h-[240px] place-items-center text-sm font-semibold text-slate-300">No media</div>;
        }

        if (mediaType === 'video') {
            return <video src={mediaUrl} controls className="h-full w-full bg-black object-cover" />;
        }

        if (mediaType === 'youtube') {
            const embed = getYouTubeEmbedUrl(currentStep?.media?.youtubeUrl || mediaUrl);
            if (embed) {
                return (
                    <iframe
                        src={embed}
                        className="h-full min-h-[260px] w-full border-0 bg-black"
                        title={`youtube-${currentStep?.id || currentStepIndex}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                );
            }
        }

        return <img src={mediaUrl} alt={currentStep?.title || 'Step media'} className="h-full w-full bg-black object-cover" />;
    };

    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass backdrop-blur">
                <h1 className="m-0 line-clamp-2 text-xl font-bold tracking-tight">{manual?.title || 'SOP Viewer'}</h1>
                <p className="mt-2 text-sm text-slate-300">{manual?.documentNumber || '-'} • v{manual?.version || '1.0'}</p>
            </header>

            {isLoading ? <div className="rounded-2xl border border-sky-400/35 bg-sky-950/35 p-3 text-sm text-sky-200">Memuat SOP...</div> : null}
            {!isLoading && error ? <div className="rounded-2xl border border-rose-400/35 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div> : null}

            {!isLoading && !error ? (
                <>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-orange-300" style={{ width: `${progress}%` }} />
                    </div>

                    <section className="min-h-[260px] overflow-hidden rounded-3xl border border-white/15 bg-black shadow-glass">
                        {renderMedia()}
                    </section>

                    <section className="space-y-2 rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass">
                        <div className="text-xs text-slate-300">Step {Math.min(currentStepIndex + 1, Math.max(steps.length, 1))} / {Math.max(steps.length, 1)} • {progress}%</div>
                        <h3 className="m-0 text-base font-semibold text-slate-100">{currentStep?.title || 'Untitled Step'}</h3>
                        <div
                            className="prose prose-invert prose-sm max-w-none text-slate-200"
                            dangerouslySetInnerHTML={{ __html: currentStep?.instructions || '<p>No instruction available.</p>' }}
                        />
                    </section>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50"
                            disabled={currentStepIndex <= 0}
                            onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                        <button
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-orange-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                            disabled={currentStepIndex >= steps.length - 1}
                            onClick={() => setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)))}
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
                <Link
                    to="/"
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-slate-200"
                >
                    <House size={15} />
                    Home
                </Link>
                <Link
                    to="/sop"
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-slate-200"
                >
                    <ListChecks size={15} />
                    List SOP
                </Link>
            </div>
        </div>
    );
};

export default SopViewerPage;
