import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, House, ListChecks } from 'lucide-react';
import { extractSteps, getPublishedManualById } from '../lib/manualApi';
import {
    captureRunCompleted,
    captureRunStarted,
    captureStepChecked,
    captureStepViewed
} from '../lib/captureApi';
import { createRun, upsertRunStep, updateRunStatus } from '../lib/executionApi';

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
    const [loadingProgress, setLoadingProgress] = useState(10);
    const [error, setError] = useState('');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [activeRun, setActiveRun] = useState(null);
    const [stepForms, setStepForms] = useState({});
    const [executionError, setExecutionError] = useState('');
    const [executionMessage, setExecutionMessage] = useState('');
    const [isStartingRun, setIsStartingRun] = useState(false);
    const [isSavingStep, setIsSavingStep] = useState(false);
    const [isCompletingRun, setIsCompletingRun] = useState(false);

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
            if (!manualId) {
                setError('manualId tidak tersedia.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setLoadingProgress(12);
            setError('');
            try {
                const data = await getPublishedManualById(manualId);
                if (!cancelled) {
                    if (!data) {
                        setError('SOP tidak ditemukan atau belum PUBLISHED.');
                    } else {
                        setManual(data);
                        setCurrentStepIndex(0);
                        setActiveRun(null);
                        setStepForms({});
                        setExecutionError('');
                        setExecutionMessage('');
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
    const currentStepForm = stepForms[currentStepIndex] || {
        isChecked: false,
        inputNumber: '',
        resultStatus: 'na',
        noteText: '',
        evidenceImageUrl: ''
    };
    const allStepsChecked = steps.length > 0
        && steps.every((_, index) => Boolean(stepForms[index]?.isChecked));

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

    const updateCurrentStepForm = (key, value) => {
        setStepForms((prev) => ({
            ...prev,
            [currentStepIndex]: {
                isChecked: prev[currentStepIndex]?.isChecked || false,
                inputNumber: prev[currentStepIndex]?.inputNumber ?? '',
                resultStatus: prev[currentStepIndex]?.resultStatus || 'na',
                noteText: prev[currentStepIndex]?.noteText || '',
                evidenceImageUrl: prev[currentStepIndex]?.evidenceImageUrl || '',
                [key]: value
            }
        }));
    };

    const handleStartExecution = async () => {
        if (!manual) return;

        setExecutionError('');
        setExecutionMessage('');
        setIsStartingRun(true);
        try {
            const run = await createRun(manual, 'viewer');
            setActiveRun(run);
            setExecutionMessage('✅ Eksekusi SOP dimulai. Lengkapi data setiap step.');
            captureRunStarted({
                runId: run?.id,
                manualId: manual?.id,
                manualTitle: manual?.title,
                source: 'viewer'
            });
        } catch (err) {
            setExecutionError(`❌ Gagal memulai eksekusi: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsStartingRun(false);
        }
    };

    const handleSaveCurrentStep = async () => {
        if (!activeRun || !currentStep) {
            setExecutionError('Mulai eksekusi dulu sebelum menyimpan step.');
            return;
        }

        setExecutionError('');
        setExecutionMessage('');
        setIsSavingStep(true);

        const numericValue = String(currentStepForm.inputNumber || '').trim();
        const parsedNumber = numericValue === '' ? null : Number(numericValue);
        const normalizedInputNumber = Number.isFinite(parsedNumber) ? parsedNumber : null;

        try {
            await upsertRunStep({
                runId: activeRun.id,
                stepIndex: currentStepIndex,
                stepTitle: currentStep?.title,
                isChecked: Boolean(currentStepForm.isChecked),
                inputNumber: normalizedInputNumber,
                resultStatus: currentStepForm.resultStatus || 'na',
                noteText: currentStepForm.noteText,
                evidenceImageUrl: currentStepForm.evidenceImageUrl
            });

            setExecutionMessage(`✅ Step ${currentStepIndex + 1} berhasil disimpan.`);
            captureStepChecked({
                runId: activeRun?.id,
                manualId,
                manualTitle: manual?.title,
                stepIndex: currentStepIndex,
                stepTitle: currentStep?.title,
                resultStatus: currentStepForm.resultStatus || 'na',
                source: 'viewer'
            });
        } catch (err) {
            setExecutionError(`❌ Gagal simpan step: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSavingStep(false);
        }
    };

    const handleCompleteRun = async () => {
        if (!activeRun) return;
        if (!allStepsChecked) {
            setExecutionError('Semua step wajib dicentang sebelum run diselesaikan.');
            return;
        }

        setExecutionError('');
        setExecutionMessage('');
        setIsCompletingRun(true);
        try {
            const updatedRun = await updateRunStatus(activeRun.id, 'completed');
            setActiveRun(updatedRun);
            setExecutionMessage('🎉 Run berhasil diselesaikan.');
            captureRunCompleted({
                runId: activeRun?.id,
                manualId,
                manualTitle: manual?.title,
                source: 'viewer'
            });
        } catch (err) {
            setExecutionError(`❌ Gagal menyelesaikan run: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsCompletingRun(false);
        }
    };

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
            <header className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-card">
                <h1 className="m-0 line-clamp-2 text-xl font-bold tracking-tight text-white">{manual?.title || 'SOP Viewer'}</h1>
                <p className="mt-2 text-sm text-slate-500">{manual?.documentNumber || '-'} • v{manual?.version || '1.0'}</p>
            </header>

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
            {!isLoading && error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-medium text-rose-300">{error}</div> : null}

            {!isLoading && !error ? (
                <>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-[width] duration-300" style={{ width: `${progress}%` }} />
                    </div>

                    <section className="min-h-[260px] overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-card">
                        {renderMedia()}
                    </section>

                    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-card">
                        <div className="text-xs font-semibold text-slate-500">Step {Math.min(currentStepIndex + 1, Math.max(steps.length, 1))} / {Math.max(steps.length, 1)} • {progress}%</div>
                        <h3 className="m-0 text-lg font-bold text-white">{currentStep?.title || 'Untitled Step'}</h3>
                        <div
                            className="prose prose-invert prose-sm max-w-none text-slate-300 prose-headings:text-white prose-a:text-cyan-400 prose-strong:text-slate-100"
                            dangerouslySetInnerHTML={{ __html: currentStep?.instructions || '<p>No instruction available.</p>' }}
                        />
                    </section>


                    <div className="grid grid-cols-2 gap-3">
                        <button
                            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                            disabled={currentStepIndex <= 0}
                            onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                        <button
                            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-bold text-white shadow-glow transition-all duration-200 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50"
                            disabled={currentStepIndex >= steps.length - 1}
                            onClick={() => setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)))}
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </>
            ) : null}

            <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                    to="/"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-cyan-400"
                >
                    <House size={16} />
                    Home
                </Link>
                <Link
                    to="/sop"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-cyan-400"
                >
                    <ListChecks size={16} />
                    List SOP
                </Link>
            </div>
        </div>
    );
};

export default SopViewerPage;
