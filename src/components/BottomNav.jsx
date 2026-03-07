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
                <nav className="relative rounded-3xl border border-white/15 bg-slate-900/90 px-4 py-3 shadow-glass backdrop-blur-xl">
                    <div className="grid grid-cols-4 items-center gap-2 sm:gap-3">
                        <Link
                            to="/"
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${isHome ? 'bg-yellow-400/20 text-yellow-300' : 'text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            <Home size={17} />
                            Home
                        </Link>

                        <Link
                            to="/sop"
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${isSop ? 'bg-yellow-400/20 text-yellow-300' : 'text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            <BookOpenText size={17} />
                            SOP
                        </Link>

                        <Link
                            to="/data"
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${isData ? 'bg-yellow-400/20 text-yellow-300' : 'text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            <Database size={17} />
                            Data
                        </Link>

                        <Link
                            to="/settings"
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${isSettings ? 'bg-yellow-400/20 text-yellow-300' : 'text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            <Settings size={17} />
                            Setting
                        </Link>
                    </div>

                    <Link
                        to="/scan"
                        className={`absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-slate-950 shadow-xl transition ${isScan
                                ? 'bg-yellow-300 text-slate-950'
                                : 'bg-gradient-to-br from-yellow-300 to-orange-400 text-slate-950 hover:brightness-105'
                            }`}
                        aria-label="Scan QR"
                    >
                        <QrCode size={26} strokeWidth={2.4} />
                    </Link>
                </nav>
            </div>
        </div>
    );
};

export default BottomNav;
