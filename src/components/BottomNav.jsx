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
                <nav className="relative rounded-3xl border border-slate-200 bg-white/95 px-4 py-3 shadow-soft backdrop-blur-xl">
                    <div className="grid grid-cols-4 items-center gap-2 sm:gap-3">
                        <Link
                            to="/"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-xs font-semibold transition ${isHome ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Home size={20} className={isHome ? 'fill-blue-50/50' : ''} />
                            Home
                        </Link>

                        <Link
                            to="/sop"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-xs font-semibold transition ${isSop ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <BookOpenText size={20} className={isSop ? 'fill-blue-50/50' : ''} />
                            SOP
                        </Link>

                        <Link
                            to="/data"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-xs font-semibold transition ${isData ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Database size={20} className={isData ? 'fill-blue-50/50' : ''} />
                            Data
                        </Link>

                        <Link
                            to="/settings"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-xs font-semibold transition ${isSettings ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Settings size={20} className={isSettings ? 'fill-blue-50/50' : ''} />
                            Setting
                        </Link>
                    </div>

                    <Link
                        to="/scan"
                        className={`absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[5px] border-slate-50 shadow-soft transition ${isScan
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
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
