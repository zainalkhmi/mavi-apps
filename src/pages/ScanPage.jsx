import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, Keyboard, ListChecks } from 'lucide-react';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { parseManualIdFromQrText } from '../lib/manualApi';
import { captureScanDetected } from '../lib/captureApi';

const isNotFoundDecodeError = (err) => String(err?.name || '').includes('NotFoundException');

const orderDevicesForQr = (devices = []) => {
    const rearRegex = /(back|rear|environment|belakang|traseira|achter|arriere)/i;
    const rear = devices.filter((device) => rearRegex.test(device?.label || ''));
    const other = devices.filter((device) => !rearRegex.test(device?.label || ''));
    return [...rear, ...other];
};

const ScanPage = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const controlsRef = useRef(null);
    const [error, setError] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const [rawValue, setRawValue] = useState('');
    const [activeCamera, setActiveCamera] = useState('');
    const [availableCameras, setAvailableCameras] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');

    useEffect(() => {
        let isActive = true;

        const startScanner = async () => {
            setError('');
            setIsStarting(true);

            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
            hints.set(DecodeHintType.TRY_HARDER, true);

            const codeReader = new BrowserMultiFormatReader(hints);

            const handleDecodeResult = (result, err, controls) => {
                if (!isActive) return;
                if (result) {
                    const text = result.getText();
                    const manualId = parseManualIdFromQrText(text);
                    if (manualId) {
                        captureScanDetected({ manualId, qrRawValue: text, source: 'scan' });
                        controls?.stop();
                        navigate(`/sop/${encodeURIComponent(manualId)}`);
                    } else {
                        setError('QR terdeteksi, tapi format manualId tidak valid.');
                    }
                    return;
                }

                if (err && !isNotFoundDecodeError(err)) {
                    setError('QR belum terbaca. Coba tingkatkan cahaya atau dekatkan kamera.');
                }
            };

            try {
                const devices = await BrowserMultiFormatReader.listVideoInputDevices();
                const orderedDevices = orderDevicesForQr(devices);
                setAvailableCameras(orderedDevices);

                let controls = null;
                if (selectedDeviceId) {
                    controls = await codeReader.decodeFromVideoDevice(
                        selectedDeviceId,
                        videoRef.current,
                        (result, err) => handleDecodeResult(result, err, controlsRef.current)
                    );
                    const selectedDevice = orderedDevices.find((item) => item.deviceId === selectedDeviceId);
                    setActiveCamera(selectedDevice?.label || 'Camera');
                } else {
                    for (const device of orderedDevices) {
                        try {
                            controls = await codeReader.decodeFromVideoDevice(
                                device.deviceId,
                                videoRef.current,
                                (result, err) => handleDecodeResult(result, err, controlsRef.current)
                            );
                            setSelectedDeviceId(device.deviceId);
                            setActiveCamera(device?.label || 'Camera');
                            break;
                        } catch {
                            // try next camera
                        }
                    }
                }

                if (!controls) {
                    throw new Error('No camera device can start scanner');
                }

                controlsRef.current = controls;
            } catch (scanError) {
                setError('Kamera tidak bisa diakses / QR belum terbaca. Coba ganti kamera atau gunakan input manual.');
                // eslint-disable-next-line no-console
                console.error('Scanner init error:', scanError);
            } finally {
                setIsStarting(false);
            }
        };

        startScanner();

        return () => {
            isActive = false;
            controlsRef.current?.stop();
        };
    }, [navigate, selectedDeviceId]);

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

            <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-glass">
                <h2 className="m-0 text-base font-semibold text-yellow-100">QR Quick Access</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Pastikan QR berada di dalam frame kamera. Jika kamera bermasalah, gunakan input manual di bawah.
                </p>
                {activeCamera ? (
                    <p className="mt-2 text-xs text-emerald-300">Kamera aktif: {activeCamera}</p>
                ) : null}
                {availableCameras.length > 1 ? (
                    <div className="mt-3 space-y-1">
                        <label htmlFor="cameraSelect" className="text-xs text-slate-300">Pilih kamera</label>
                        <select
                            id="cameraSelect"
                            value={selectedDeviceId}
                            onChange={(event) => setSelectedDeviceId(event.target.value)}
                            className="min-h-[40px] w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-300"
                        >
                            {availableCameras.map((camera) => (
                                <option key={camera.deviceId} value={camera.deviceId}>
                                    {camera.label || `Camera ${camera.deviceId.slice(0, 4)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}
            </section>

            <div className="relative min-h-[280px] overflow-hidden rounded-3xl border border-white/15 bg-black shadow-glass">
                <video ref={videoRef} className="h-[320px] w-full object-cover" muted autoPlay playsInline />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-44 w-44 rounded-2xl border-2 border-yellow-300/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
                </div>
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

            <div className="grid grid-cols-2 gap-2">
                <Link
                    to="/"
                    className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-slate-200"
                >
                    Kembali
                </Link>
                <Link
                    to="/sop"
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-slate-200"
                >
                    <ListChecks size={15} />
                    Lihat List SOP
                </Link>
            </div>
        </div>
    );
};

export default ScanPage;
