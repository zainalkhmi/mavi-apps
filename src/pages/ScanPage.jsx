import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Keyboard } from 'lucide-react';
import { parseManualIdFromQrText } from '../lib/manualApi';
import { captureScanDetected } from '../lib/captureApi';

const SCANNER_ELEMENT_ID = 'qr-reader';
const SCAN_CONFIG = {
    fps: 20,
    qrbox: { width: 300, height: 300 },
    aspectRatio: 1,
    disableFlip: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
    }
};

const BACK_CAMERA_LABEL_PATTERN = /(back|rear|environment|belakang)/i;

const getFriendlyCameraError = (err) => {
    const name = String(err?.name || '');
    const message = String(err?.message || err || '');

    if (!window.isSecureContext) {
        return 'Kamera butuh HTTPS. Buka app via https:// atau localhost agar scan QR bisa dipakai.';
    }
    if (
        name.includes('NotAllowedError')
        || name.includes('PermissionDeniedError')
        || /permission|denied|not.?allowed/i.test(message)
    ) {
        return 'Izin kamera ditolak. Aktifkan izin kamera untuk browser lalu coba lagi.';
    }
    if (name.includes('NotReadableError') || name.includes('TrackStartError') || /not.?readable/i.test(message)) {
        return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi lain lalu coba lagi.';
    }
    if (name.includes('NotFoundError') || name.includes('DevicesNotFoundError') || /not.?found/i.test(message)) {
        return 'Kamera tidak ditemukan di perangkat ini.';
    }
    return 'Kamera tidak bisa diakses / QR belum terbaca. Coba ganti kamera atau gunakan input manual.';
};

const ScanPage = () => {
    const navigate = useNavigate();
    const scannerRef = useRef(null);
    const hasNavigatedRef = useRef(false);
    const lastUnsupportedQrRef = useRef('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const [rawValue, setRawValue] = useState('');

    useEffect(() => {
        let isActive = true;

        const stopScanner = async () => {
            const scanner = scannerRef.current;
            if (!scanner) return;

            try {
                if (scanner.isScanning) {
                    await scanner.stop();
                }
                await scanner.clear();
            } catch {
                // ignore
            }

            scannerRef.current = null;
        };

        const startScanner = async () => {
            setError('');
            setInfo('');
            setIsStarting(true);

            hasNavigatedRef.current = false;

            // Hack for React 18 Strict Mode double-invoke:
            // Tunggu sebentar untuk membiarkan StrictMode segera memanggil cleanup function.
            // Jika dalam waktu tunggu (50ms) komponen di-unmount, fungsi akan dibatalkan.
            await new Promise((resolve) => setTimeout(resolve, 50));
            if (!isActive) return;

            await stopScanner();

            try {
                const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
                scannerRef.current = scanner;

                const handleDecoded = (decodedText) => {
                    if (!isActive || hasNavigatedRef.current) return;

                    const manualId = parseManualIdFromQrText(decodedText);
                    if (!manualId) {
                        const normalizedRaw = String(decodedText || '').trim();
                        setError('');
                        setRawValue(normalizedRaw);
                        setInfo('QR terbaca, tetapi bukan referensi SOP.');

                        if (normalizedRaw && lastUnsupportedQrRef.current !== normalizedRaw) {
                            lastUnsupportedQrRef.current = normalizedRaw;
                            captureScanDetected({ manualId: null, qrRawValue: normalizedRaw, source: 'scan_non_sop' });
                        }
                        return;
                    }

                    setInfo('');
                    setError('');
                    hasNavigatedRef.current = true;
                    captureScanDetected({ manualId, qrRawValue: decodedText, source: 'scan' });

                    stopScanner().finally(() => {
                        navigate(`/sop/${encodeURIComponent(manualId)}`);
                    });
                };

                const handleScanFrameError = (scanErrorMessage) => {
                    if (!isActive) return;
                    if (/NotFoundException/i.test(String(scanErrorMessage || ''))) return;
                    // Abaikan error per-frame
                };

                const tryStart = async (cameraConfig) => {
                    await scanner.start(cameraConfig, SCAN_CONFIG, handleDecoded, handleScanFrameError);
                    return true;
                };

                let started = false;
                let lastStartError = null;

                const cameraAttempts = [
                    { facingMode: { exact: 'environment' } },
                    { facingMode: 'environment' }
                ];

                for (const attempt of cameraAttempts) {
                    if (started) break;
                    try {
                        await tryStart(attempt);
                        started = true;
                    } catch (err) {
                        lastStartError = err;
                    }
                }

                if (!started) {
                    try {
                        const cameras = await Html5Qrcode.getCameras();
                        const preferred = (cameras || []).find((cam) => BACK_CAMERA_LABEL_PATTERN.test(String(cam?.label || '')));
                        const fallback = preferred || (cameras || [])[0] || null;
                        if (fallback?.id) {
                            await tryStart(fallback.id);
                            started = true;
                        }
                    } catch (err) {
                        lastStartError = err;
                    }
                }

                if (!started) {
                    throw lastStartError || new Error('Gagal menyalakan scanner kamera.');
                }
            } catch (scanError) {
                setError(getFriendlyCameraError(scanError));
                // eslint-disable-next-line no-console
                console.error('Scanner init error:', scanError);
            } finally {
                setIsStarting(false);
            }
        };

        startScanner();

        return () => {
            isActive = false;
            stopScanner();
        };
    }, [navigate]);

    const handleManualOpen = () => {
        const manualId = parseManualIdFromQrText(rawValue);
        if (!manualId) {
            setError('');
            setInfo('QR terbaca, tetapi bukan referensi SOP.');
            return;
        }
        setInfo('');
        captureScanDetected({ manualId, qrRawValue: rawValue, source: 'manual_input' });
        navigate(`/sop/${encodeURIComponent(manualId)}`);
    };

    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    <Camera size={14} />
                    QR Scanner
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-800">Scan QR SOP</h1>
                <p className="mt-2 text-sm text-slate-500">
                    Arahkan kamera ke QR SOP dari mavi-y untuk membuka manual secara instan.
                </p>
            </header>


            <div className="relative min-h-[280px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-soft">
                <div id={SCANNER_ELEMENT_ID} className="w-full" />
                {isStarting && (
                    <div className="absolute inset-0 grid place-items-center bg-slate-900/80 text-sm font-medium text-white backdrop-blur-sm">
                        Menyalakan kamera...
                    </div>
                )}
            </div>

            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
                <label htmlFor="manualInput" className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Keyboard size={16} />
                    Fallback manual input (link atau manualId)
                </label>
                <input
                    id="manualInput"
                    type="text"
                    value={rawValue}
                    onChange={(e) => setRawValue(e.target.value)}
                    placeholder="Contoh: https://domain/#/manual/{id}"
                    className="min-h-[46px] w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="m-0 text-xs leading-relaxed text-slate-500">
                    Tip: kamu bisa tempel URL QR lengkap atau UUID manualId.
                </p>
                <button
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50"
                    onClick={handleManualOpen}
                >
                    🚀 Buka SOP
                </button>
                {info ? <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">{info}</div> : null}
                {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{error}</div> : null}
            </div>

        </div>
    );
};

export default ScanPage;
