import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Keyboard } from 'lucide-react';
import { parseManualIdFromQrText } from '../lib/manualApi';
import { captureScanDetected } from '../lib/captureApi';

const SCANNER_ELEMENT_ID = 'qr-reader';

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
    const [error, setError] = useState('');
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

                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10 },
                    (decodedText) => {
                        if (!isActive || hasNavigatedRef.current) return;

                        const manualId = parseManualIdFromQrText(decodedText);
                        if (!manualId) {
                            setError('QR terdeteksi, tapi format manualId tidak valid.');
                            return;
                        }

                        hasNavigatedRef.current = true;
                        captureScanDetected({ manualId, qrRawValue: decodedText, source: 'scan' });

                        stopScanner().finally(() => {
                            navigate(`/sop/${encodeURIComponent(manualId)}`);
                        });
                    },
                    (scanErrorMessage) => {
                        if (!isActive) return;
                        if (/NotFoundException/i.test(String(scanErrorMessage || ''))) return;
                        // Abaikan error per-frame
                    }
                );
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
            setError('Input tidak valid. Tempel URL QR atau UUID manualId.');
            return;
        }
        captureScanDetected({ manualId, qrRawValue: rawValue, source: 'manual_input' });
        navigate(`/sop/${encodeURIComponent(manualId)}`);
    };

    return (
        <div className="space-y-4 pb-4">
            <header className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass backdrop-blur">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-yellow-300/20 px-3 py-1 text-xs font-semibold text-yellow-200">
                    <Camera size={14} />
                    QR Scanner
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight">Scan QR SOP</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Arahkan kamera ke QR SOP dari mavi-y untuk membuka manual secara instan.
                </p>
            </header>


            <div className="relative min-h-[280px] overflow-hidden rounded-3xl border border-white/15 bg-black shadow-glass">
                <div id={SCANNER_ELEMENT_ID} className="w-full" />
                {isStarting && (
                    <div className="absolute inset-0 grid place-items-center bg-slate-950/75 text-sm font-semibold">
                        Menyalakan kamera...
                    </div>
                )}
            </div>

            <div className="space-y-3 rounded-3xl border border-white/15 bg-white/10 p-4 shadow-glass">
                <label htmlFor="manualInput" className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Keyboard size={16} />
                    Fallback manual input (link atau manualId)
                </label>
                <input
                    id="manualInput"
                    type="text"
                    value={rawValue}
                    onChange={(e) => setRawValue(e.target.value)}
                    placeholder="Contoh: https://domain/#/manual/{id}"
                    className="min-h-[46px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/25"
                />
                <p className="m-0 text-xs leading-relaxed text-slate-300">
                    Tip: kamu bisa tempel URL QR lengkap atau UUID manualId.
                </p>
                <button
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-yellow-300 to-orange-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105"
                    onClick={handleManualOpen}
                >
                    🚀 Buka SOP
                </button>
                {error ? <div className="rounded-2xl border border-rose-400/35 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div> : null}
            </div>

        </div>
    );
};

export default ScanPage;
