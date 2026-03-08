import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpenText, Database, Home, QrCode, Settings } from 'lucide-react';

const BottomNav = () => {
    const location = useLocation();

    const isHome = location.pathname === '/';
    const isSop = location.pathname.startsWith('/sop');
    const isData = location.pathname === '/data';
    const isScan = location.pathname === '/scan';
    const isSettings = location.pathname === '/settings';

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
            <div className="pointer-events-auto mx-auto w-full max-w-md md:max-w-none md:px-2">
                <nav className="relative rounded-2xl border border-slate-700/50 bg-slate-900/90 px-4 py-3 shadow-card backdrop-blur-xl">
                    <div className="grid grid-cols-4 items-center gap-2 sm:gap-3">
                        <Link
                            to="/"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-200 ${isHome ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <Home size={20} />
                            Home
                        </Link>

                        <Link
                            to="/sop"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-200 ${isSop ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <BookOpenText size={20} />
                            SOP
                        </Link>

                        <Link
                            to="/data"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-200 ${isData ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <Database size={20} />
                            Data
                        </Link>

                        <Link
                            to="/settings"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-200 ${isSettings ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <Settings size={20} />
                            Setting
                        </Link>
                    </div>

                    <Link
                        to="/scan"
                        className={`absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[4px] border-slate-950 transition-all duration-200 ${isScan
                            ? 'bg-cyan-400 text-slate-950 shadow-glow'
                            : 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-glow hover:from-cyan-300 hover:to-blue-400'
                            }`}
                        aria-label="Scan QR"
                    >
                        <QrCode size={24} strokeWidth={2.5} />
                    </Link>
                </nav>
            </div>
        </div>
    );
};

export default BottomNav;
